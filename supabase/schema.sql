-- ============================================================
-- CRM Comercial — Gambit Labs
-- Schema completo para Supabase
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'diretor_comercial', 'comercial')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Admin can manage profiles" on public.profiles
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- TEAMS (F01)
-- ============================================================
create table public.teams (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  director_id uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table public.team_members (
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (team_id, user_id)
);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

create policy "Authenticated can view teams" on public.teams
  for select using (auth.role() = 'authenticated');

create policy "Admin/Director can manage teams" on public.teams
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'diretor_comercial'))
  );

create policy "Authenticated can view team members" on public.team_members
  for select using (auth.role() = 'authenticated');

create policy "Admin/Director can manage team members" on public.team_members
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'diretor_comercial'))
  );

-- ============================================================
-- CLIENTS (F08)
-- ============================================================
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text,
  phone text,
  company text,
  sector text,
  status text not null default 'lead' check (status in ('lead', 'prospect', 'ativo', 'inativo', 'arquivado')),
  owner_id uuid references public.profiles(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.clients enable row level security;

create policy "Admin/Director see all clients" on public.clients
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'diretor_comercial'))
  );

create policy "Comercial sees own clients" on public.clients
  for select using (owner_id = auth.uid());

create policy "Authenticated can create clients" on public.clients
  for insert with check (auth.role() = 'authenticated');

create policy "Owner can update own clients" on public.clients
  for update using (
    owner_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'diretor_comercial'))
  );

-- ============================================================
-- OPPORTUNITIES / PIPELINE (F03)
-- ============================================================
create table public.opportunities (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  client_id uuid references public.clients(id),
  owner_id uuid references public.profiles(id),
  stage text not null default 'lead' check (stage in ('lead', 'contactado', 'proposta', 'negociacao', 'fecho', 'perdido')),
  value numeric(12,2) default 0,
  expected_close_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.opportunities enable row level security;

create policy "Admin/Director see all opportunities" on public.opportunities
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'diretor_comercial'))
  );

create policy "Comercial sees own opportunities" on public.opportunities
  for select using (owner_id = auth.uid());

create policy "Authenticated can create opportunities" on public.opportunities
  for insert with check (auth.role() = 'authenticated');

create policy "Owner/Admin/Director can update" on public.opportunities
  for update using (
    owner_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'diretor_comercial'))
  );

-- ============================================================
-- TASKS (F04)
-- ============================================================
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  status text not null default 'por_fazer' check (status in ('por_fazer', 'em_progresso', 'concluida', 'cancelada')),
  priority text not null default 'normal' check (priority in ('baixa', 'normal', 'alta', 'urgente')),
  due_date timestamptz,
  client_id uuid references public.clients(id),
  opportunity_id uuid references public.opportunities(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tasks enable row level security;

create policy "Admin sees all tasks" on public.tasks
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Director sees team tasks" on public.tasks
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'diretor_comercial')
  );

create policy "User sees own tasks" on public.tasks
  for select using (assigned_to = auth.uid() or created_by = auth.uid());

create policy "Authenticated can create tasks" on public.tasks
  for insert with check (auth.role() = 'authenticated');

create policy "Assigned/Admin/Director can update tasks" on public.tasks
  for update using (
    assigned_to = auth.uid() or created_by = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'diretor_comercial'))
  );

-- ============================================================
-- CALENDAR EVENTS (F05/F06)
-- ============================================================
create table public.calendar_events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  event_type text not null default 'outro' check (event_type in ('reuniao', 'chamada', 'visita', 'demo', 'outro')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  owner_id uuid references public.profiles(id),
  client_id uuid references public.clients(id),
  opportunity_id uuid references public.opportunities(id),
  created_at timestamptz default now()
);

alter table public.calendar_events enable row level security;

create policy "Admin sees all events" on public.calendar_events
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Director sees team events" on public.calendar_events
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'diretor_comercial')
  );

create policy "User sees own events" on public.calendar_events
  for select using (owner_id = auth.uid());

create policy "Authenticated can create events" on public.calendar_events
  for insert with check (auth.role() = 'authenticated');

create policy "Owner/Admin/Director can update events" on public.calendar_events
  for update using (
    owner_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'diretor_comercial'))
  );

-- ============================================================
-- COMMISSIONS (F07)
-- ============================================================
create table public.commissions (
  id uuid default uuid_generate_v4() primary key,
  opportunity_id uuid references public.opportunities(id),
  user_id uuid references public.profiles(id),
  amount numeric(12,2) not null,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'paga')),
  approved_by uuid references public.profiles(id),
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table public.commission_rules (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references public.teams(id),
  percentage numeric(5,2) not null,
  min_value numeric(12,2),
  max_value numeric(12,2),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.commissions enable row level security;
alter table public.commission_rules enable row level security;

create policy "Admin sees all commissions" on public.commissions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Director sees commissions" on public.commissions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'diretor_comercial')
  );

create policy "User sees own commissions" on public.commissions
  for select using (user_id = auth.uid());

create policy "Admin can manage commissions" on public.commissions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- INVOICES (F09)
-- ============================================================
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  opportunity_id uuid references public.opportunities(id),
  user_id uuid references public.profiles(id),
  number text not null,
  amount numeric(12,2) not null,
  status text not null default 'emitida' check (status in ('emitida', 'enviada', 'paga', 'em_atraso')),
  issued_at date not null,
  paid_at date,
  created_at timestamptz default now()
);

alter table public.invoices enable row level security;

create policy "Admin/Director see all invoices" on public.invoices
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'diretor_comercial'))
  );

create policy "User sees own invoices" on public.invoices
  for select using (user_id = auth.uid());

create policy "Admin can manage invoices" on public.invoices
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- PROPOSALS (F10)
-- ============================================================
create table public.proposals (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  client_id uuid references public.clients(id),
  opportunity_id uuid references public.opportunities(id),
  owner_id uuid references public.profiles(id),
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'negociacao', 'aceite', 'recusada')),
  content jsonb not null default '{}',
  valid_until date,
  version integer not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.proposals enable row level security;

create policy "Admin/Director see all proposals" on public.proposals
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'diretor_comercial'))
  );

create policy "User sees own proposals" on public.proposals
  for select using (owner_id = auth.uid());

create policy "Authenticated can create proposals" on public.proposals
  for insert with check (auth.role() = 'authenticated');

create policy "Owner/Admin/Director can update proposals" on public.proposals
  for update using (
    owner_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'diretor_comercial'))
  );

-- ============================================================
-- PROCEDURES (F11)
-- ============================================================
create table public.procedures (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  category text not null,
  content text not null,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.procedure_reads (
  procedure_id uuid references public.procedures(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (procedure_id, user_id)
);

alter table public.procedures enable row level security;
alter table public.procedure_reads enable row level security;

create policy "All see published procedures" on public.procedures
  for select using (is_published = true or exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'diretor_comercial')
  ));

create policy "Admin/Director can manage procedures" on public.procedures
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'diretor_comercial'))
  );

create policy "Authenticated can manage own reads" on public.procedure_reads
  for all using (user_id = auth.uid());

-- ============================================================
-- CHAT (F02)
-- ============================================================
create table public.chat_channels (
  id uuid default uuid_generate_v4() primary key,
  name text,
  type text not null check (type in ('direct', 'group', 'team')),
  team_id uuid references public.teams(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table public.chat_channel_members (
  channel_id uuid references public.chat_channels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (channel_id, user_id)
);

create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  channel_id uuid references public.chat_channels(id) on delete cascade,
  sender_id uuid references public.profiles(id),
  content text not null,
  created_at timestamptz default now()
);

alter table public.chat_channels enable row level security;
alter table public.chat_channel_members enable row level security;
alter table public.chat_messages enable row level security;

create policy "Channel members can view channel" on public.chat_channels
  for select using (
    exists (select 1 from public.chat_channel_members where channel_id = id and user_id = auth.uid())
  );

create policy "Authenticated can create channels" on public.chat_channels
  for insert with check (auth.role() = 'authenticated');

create policy "Members can view channel members" on public.chat_channel_members
  for select using (user_id = auth.uid());

create policy "Authenticated can join channels" on public.chat_channel_members
  for insert with check (auth.role() = 'authenticated');

create policy "Channel members can view messages" on public.chat_messages
  for select using (
    exists (select 1 from public.chat_channel_members where channel_id = chat_messages.channel_id and user_id = auth.uid())
  );

create policy "Channel members can send messages" on public.chat_messages
  for insert with check (
    sender_id = auth.uid() and
    exists (select 1 from public.chat_channel_members where channel_id = chat_messages.channel_id and user_id = auth.uid())
  );

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'comercial')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TRIGGER: update updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger set_clients_updated_at before update on public.clients
  for each row execute procedure public.set_updated_at();
create trigger set_opportunities_updated_at before update on public.opportunities
  for each row execute procedure public.set_updated_at();
create trigger set_tasks_updated_at before update on public.tasks
  for each row execute procedure public.set_updated_at();
create trigger set_proposals_updated_at before update on public.proposals
  for each row execute procedure public.set_updated_at();
create trigger set_procedures_updated_at before update on public.procedures
  for each row execute procedure public.set_updated_at();
