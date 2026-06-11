import { createClient } from '@/lib/supabase/client'
import { Rule, Alert } from '@/types'

export async function evaluateRules(userId: string): Promise<Alert[]> {
  const supabase = createClient()

  const { data: rules } = await supabase
    .from('rules')
    .select('*')
    .eq('is_active', true)

  if (!rules || rules.length === 0) return []

  const now = new Date()
  const newAlerts: Omit<Alert, 'id' | 'created_at'>[] = []

  for (const rule of rules as Rule[]) {
    const cfg = rule.trigger_config as Record<string, unknown>

    if (rule.trigger_type === 'oportunidade_parada') {
      const dias = Number(cfg.dias ?? 7)
      const cutoff = new Date(now.getTime() - dias * 86400000).toISOString()
      const { data: opps } = await supabase
        .from('opportunities')
        .select('id, title, stage, owner_id, updated_at')
        .neq('stage', 'fecho')
        .neq('stage', 'perdido')
        .lt('updated_at', cutoff)

      for (const opp of opps ?? []) {
        newAlerts.push({
          rule_id: rule.id,
          rule_name: rule.name,
          entity_type: 'opportunity',
          entity_id: opp.id,
          entity_name: opp.title,
          message: `"${opp.title}" está parada há mais de ${dias} dias sem atualização.`,
          severity: rule.severity,
          is_read: false,
          assigned_to: opp.owner_id,
        })
      }
    }

    if (rule.trigger_type === 'prazo_fecho_proximo') {
      const dias = Number(cfg.dias ?? 3)
      const future = new Date(now.getTime() + dias * 86400000).toISOString().split('T')[0]
      const today = now.toISOString().split('T')[0]
      const { data: opps } = await supabase
        .from('opportunities')
        .select('id, title, owner_id, expected_close_date')
        .in('stage', ['proposta', 'negociacao'])
        .lte('expected_close_date', future)
        .gte('expected_close_date', today)

      for (const opp of opps ?? []) {
        newAlerts.push({
          rule_id: rule.id,
          rule_name: rule.name,
          entity_type: 'opportunity',
          entity_id: opp.id,
          entity_name: opp.title,
          message: `"${opp.title}" tem prazo de fecho em ${opp.expected_close_date}.`,
          severity: rule.severity,
          is_read: false,
          assigned_to: opp.owner_id,
        })
      }
    }

    if (rule.trigger_type === 'tarefa_atrasada') {
      const today = now.toISOString().split('T')[0]
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, assigned_to, due_date')
        .in('status', ['por_fazer', 'em_progresso'])
        .lt('due_date', today)

      for (const task of tasks ?? []) {
        newAlerts.push({
          rule_id: rule.id,
          rule_name: rule.name,
          entity_type: 'task',
          entity_id: task.id,
          entity_name: task.title,
          message: `Tarefa "${task.title}" está atrasada (prazo: ${task.due_date}).`,
          severity: rule.severity,
          is_read: false,
          assigned_to: task.assigned_to,
        })
      }
    }

    if (rule.trigger_type === 'valor_alto') {
      const valor = Number(cfg.valor ?? 10000)
      const { data: opps } = await supabase
        .from('opportunities')
        .select('id, title, owner_id, value')
        .gte('value', valor)
        .in('stage', ['lead', 'contactado', 'proposta', 'negociacao'])

      for (const opp of opps ?? []) {
        newAlerts.push({
          rule_id: rule.id,
          rule_name: rule.name,
          entity_type: 'opportunity',
          entity_id: opp.id,
          entity_name: opp.title,
          message: `Oportunidade de alto valor "${opp.title}" (${opp.value}€) requer atenção.`,
          severity: rule.severity,
          is_read: false,
          assigned_to: opp.owner_id,
        })
      }
    }
  }

  if (newAlerts.length === 0) return []

  // Deduplicate: check which (rule_id + entity_id) combos already have unread alerts today
  const { data: existing } = await supabase
    .from('alerts')
    .select('rule_id, entity_id')
    .eq('is_read', false)

  const existingKeys = new Set(
    (existing ?? []).map((a: { rule_id: string; entity_id: string }) => `${a.rule_id}:${a.entity_id}`)
  )

  const toInsert = newAlerts.filter(
    a => !existingKeys.has(`${a.rule_id}:${a.entity_id}`)
  )

  if (toInsert.length === 0) return []

  const { data: inserted } = await supabase
    .from('alerts')
    .insert(toInsert)
    .select()

  return (inserted ?? []) as Alert[]
}
