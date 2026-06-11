-- =========================================
-- MÉTRICAS E OBJETIVOS
-- Executar no Supabase SQL Editor
-- =========================================

CREATE TABLE IF NOT EXISTS metric_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  metric_type text NOT NULL,
  period text NOT NULL DEFAULT 'monthly',
  default_target numeric NOT NULL DEFAULT 0,
  unit text DEFAULT '',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metric_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id uuid REFERENCES metric_definitions(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  target numeric NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(metric_id, assigned_to, period_start)
);

ALTER TABLE metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_assignments ENABLE ROW LEVEL SECURITY;

-- Definições: todos lêem, só admin escreve
CREATE POLICY "metric_def_read" ON metric_definitions FOR SELECT USING (true);
CREATE POLICY "metric_def_admin" ON metric_definitions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Assignments: cada user vê os seus; admin e diretor vêem todos
CREATE POLICY "metric_assign_read" ON metric_assignments FOR SELECT USING (
  assigned_to = auth.uid() OR assigned_by = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor_comercial'))
);
CREATE POLICY "metric_assign_write" ON metric_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor_comercial'))
);

-- Métricas de exemplo
INSERT INTO metric_definitions (name, description, metric_type, period, default_target, unit) VALUES
  ('Reuniões mensais',     'Nº de reuniões agendadas no mês',          'reunioes_este_mes',    'monthly', 10,    'reuniões'),
  ('Leads criados',        'Nº de novas oportunidades criadas no mês', 'leads_este_mes',       'monthly', 8,     'leads'),
  ('Valor no pipeline',    'Valor total das oportunidades ativas',     'valor_pipeline',       'monthly', 50000, '€'),
  ('Oportunidades ativas', 'Nº de oportunidades em aberto',            'oportunidades_ativas', 'monthly', 15,    'opps')
ON CONFLICT DO NOTHING;
