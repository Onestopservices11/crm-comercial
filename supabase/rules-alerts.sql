-- =========================================
-- MOTOR DE REGRAS E ALERTAS
-- Executar no Supabase SQL Editor
-- =========================================

-- Tabela de regras
CREATE TABLE IF NOT EXISTS rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}',
  action_type text NOT NULL DEFAULT 'criar_alerta',
  action_config jsonb NOT NULL DEFAULT '{}',
  severity text NOT NULL DEFAULT 'warning',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de alertas gerados
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES rules(id) ON DELETE SET NULL,
  rule_name text,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_name text,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  is_read boolean DEFAULT false,
  assigned_to uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Rules: todos podem ler (para avaliação), só admin pode escrever
CREATE POLICY "rules_read_all" ON rules FOR SELECT USING (true);
CREATE POLICY "rules_write_admin" ON rules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "rules_update_admin" ON rules FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "rules_delete_admin" ON rules FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Alerts: cada user vê os seus; admin e diretor vêem todos
CREATE POLICY "alerts_own" ON alerts FOR SELECT USING (
  assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor_comercial'))
);
CREATE POLICY "alerts_insert_any" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "alerts_update_own" ON alerts FOR UPDATE USING (
  assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'diretor_comercial'))
);

-- Regras de exemplo para começar
INSERT INTO rules (name, description, trigger_type, trigger_config, severity) VALUES
  ('Oportunidades paradas 7 dias', 'Alerta quando uma oportunidade activa não é actualizada há mais de 7 dias', 'oportunidade_parada', '{"dias": 7}', 'warning'),
  ('Fecho em menos de 3 dias', 'Alerta quando uma proposta ou negociação tem fecho esperado nos próximos 3 dias', 'prazo_fecho_proximo', '{"dias": 3}', 'danger'),
  ('Tarefas atrasadas', 'Alerta quando uma tarefa ultrapassa o prazo sem ser concluída', 'tarefa_atrasada', '{}', 'warning')
ON CONFLICT DO NOTHING;
