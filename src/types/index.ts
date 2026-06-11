export type UserRole = 'admin' | 'diretor_comercial' | 'comercial'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  active?: boolean
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  description?: string
  director_id: string
  created_at: string
  director?: UserProfile
  members?: TeamMember[]
}

export interface TeamMember {
  team_id: string
  user_id: string
  joined_at: string
  user?: UserProfile
}

export interface Opportunity {
  id: string
  title: string
  client_id: string
  owner_id: string
  stage: PipelineStage
  value: number
  expected_close_date?: string
  notes?: string
  created_at: string
  updated_at: string
  client?: Client
  owner?: UserProfile
}

export type PipelineStage = 'lead' | 'contactado' | 'proposta' | 'negociacao' | 'fecho' | 'perdido'

export interface Task {
  id: string
  title: string
  description?: string
  assigned_to: string
  created_by: string
  status: TaskStatus
  priority: TaskPriority
  due_date?: string
  client_id?: string
  opportunity_id?: string
  created_at: string
  updated_at: string
  assignee?: UserProfile
  creator?: UserProfile
}

export type TaskStatus = 'por_fazer' | 'em_progresso' | 'concluida' | 'cancelada'
export type TaskPriority = 'baixa' | 'normal' | 'alta' | 'urgente'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  event_type: EventType
  start_at: string
  end_at: string
  owner_id: string
  client_id?: string
  opportunity_id?: string
  created_at: string
  owner?: UserProfile
  client?: { id: string; name: string }
}

export type EventType = 'reuniao' | 'chamada' | 'visita' | 'demo' | 'outro'

export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  sector?: string
  status: ClientStatus
  owner_id: string
  notes?: string
  created_at: string
  updated_at: string
  owner?: UserProfile
}

export type ClientStatus = 'lead' | 'prospect' | 'ativo' | 'inativo' | 'arquivado'

export interface Commission {
  id: string
  opportunity_id: string
  user_id: string
  amount: number
  status: CommissionStatus
  approved_by?: string
  paid_at?: string
  created_at: string
  opportunity?: Opportunity
  user?: UserProfile
}

export type CommissionStatus = 'pendente' | 'aprovada' | 'paga'

export interface Invoice {
  id: string
  opportunity_id: string
  user_id: string
  number: string
  amount: number
  status: InvoiceStatus
  issued_at: string
  paid_at?: string
  created_at: string
  opportunity?: Opportunity
  user?: UserProfile
}

export type InvoiceStatus = 'emitida' | 'enviada' | 'paga' | 'em_atraso'

export interface Proposal {
  id: string
  title: string
  client_id: string
  opportunity_id?: string
  owner_id: string
  status: ProposalStatus
  content: Record<string, unknown>
  valid_until?: string
  version: number
  created_at: string
  updated_at: string
  client?: Client
  owner?: UserProfile
}

export type ProposalStatus = 'rascunho' | 'enviada' | 'negociacao' | 'aceite' | 'recusada'

export interface Procedure {
  id: string
  title: string
  category: string
  content: string
  is_published: boolean
  created_by: string
  created_at: string
  updated_at: string
  creator?: UserProfile
}

export interface ChatMessage {
  id: string
  channel_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: UserProfile
}

export interface ChatChannel {
  id: string
  name: string
  type: 'direct' | 'group' | 'team'
  team_id?: string
  created_by: string
  created_at: string
}

export interface MetricDefinition {
  id: string
  name: string
  description?: string
  metric_type: string
  period: string
  default_target: number
  unit: string
  is_active: boolean
  created_by?: string
  created_at: string
}

export interface MetricAssignment {
  id: string
  metric_id: string
  assigned_to: string
  assigned_by?: string
  target: number
  period_start: string
  period_end: string
  created_at: string
  metric?: MetricDefinition
  user?: UserProfile
}

export type RuleSeverity = 'info' | 'warning' | 'danger'

export interface Rule {
  id: string
  name: string
  definition: Record<string, unknown>
  severity: RuleSeverity
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Alert {
  id: string
  rule_id?: string
  rule_name?: string
  entity_type: string
  entity_id: string
  entity_name?: string
  message: string
  severity: RuleSeverity
  is_read: boolean
  assigned_to?: string
  created_at: string
}
