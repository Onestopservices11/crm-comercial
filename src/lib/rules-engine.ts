import { createClient } from '@/lib/supabase/client'
import { Alert } from '@/types'

export type RuleEntityType = 'opportunity' | 'task' | 'client'
export type RuleOperator =
  | 'equals' | 'not_equals'
  | 'greater_than' | 'less_than'
  | 'older_than_days' | 'within_days'
  | 'contains'

export interface RuleCondition {
  field: string
  operator: RuleOperator
  value: string
}

export interface RuleAction {
  type: 'create_alert'
  severity: 'info' | 'warning' | 'danger'
  message_template: string  // pode usar {name}, {field}, {value}
}

export interface RuleDefinition {
  entity_type: RuleEntityType
  conditions: RuleCondition[]
  action: RuleAction
}

// Campos disponíveis por entidade
export const ENTITY_FIELDS: Record<RuleEntityType, { key: string; label: string; type: 'text' | 'number' | 'days' | 'select' }[]> = {
  opportunity: [
    { key: 'stage', label: 'Etapa', type: 'select' },
    { key: 'value', label: 'Valor (€)', type: 'number' },
    { key: 'days_since_update', label: 'Dias sem atualização', type: 'days' },
    { key: 'days_until_close', label: 'Dias até ao fecho', type: 'days' },
  ],
  task: [
    { key: 'status', label: 'Estado', type: 'select' },
    { key: 'priority', label: 'Prioridade', type: 'select' },
    { key: 'days_overdue', label: 'Dias em atraso', type: 'days' },
  ],
  client: [
    { key: 'status', label: 'Estado', type: 'select' },
    { key: 'days_since_update', label: 'Dias sem atualização', type: 'days' },
  ],
}

export const FIELD_OPTIONS: Record<string, { value: string; label: string }[]> = {
  'opportunity.stage': [
    { value: 'lead', label: 'Lead' },
    { value: 'contactado', label: 'Contactado' },
    { value: 'proposta', label: 'Proposta' },
    { value: 'negociacao', label: 'Negociação' },
    { value: 'fecho', label: 'Fecho' },
    { value: 'perdido', label: 'Perdido' },
  ],
  'task.status': [
    { value: 'por_fazer', label: 'Por Fazer' },
    { value: 'em_progresso', label: 'Em Progresso' },
    { value: 'concluida', label: 'Concluída' },
    { value: 'cancelada', label: 'Cancelada' },
  ],
  'task.priority': [
    { value: 'baixa', label: 'Baixa' },
    { value: 'normal', label: 'Normal' },
    { value: 'alta', label: 'Alta' },
    { value: 'urgente', label: 'Urgente' },
  ],
  'client.status': [
    { value: 'lead', label: 'Lead' },
    { value: 'prospect', label: 'Prospect' },
    { value: 'ativo', label: 'Ativo' },
    { value: 'inativo', label: 'Inativo' },
    { value: 'arquivado', label: 'Arquivado' },
  ],
}

export const OPERATORS_FOR_TYPE: Record<string, { value: RuleOperator; label: string }[]> = {
  select: [
    { value: 'equals', label: 'é igual a' },
    { value: 'not_equals', label: 'é diferente de' },
  ],
  number: [
    { value: 'equals', label: 'é igual a' },
    { value: 'greater_than', label: 'é maior que' },
    { value: 'less_than', label: 'é menor que' },
  ],
  days: [
    { value: 'greater_than', label: 'é mais de X dias' },
    { value: 'less_than', label: 'é menos de X dias' },
  ],
  text: [
    { value: 'equals', label: 'é igual a' },
    { value: 'contains', label: 'contém' },
  ],
}

// Avalia uma condição contra um registo
function evalCondition(cond: RuleCondition, record: Record<string, unknown>, now: Date): boolean {
  const { field, operator, value } = cond
  const numValue = Number(value)

  if (field === 'days_since_update') {
    const updated = record.updated_at as string
    if (!updated) return false
    const days = (now.getTime() - new Date(updated).getTime()) / 86400000
    if (operator === 'greater_than') return days > numValue
    if (operator === 'less_than') return days < numValue
    return false
  }

  if (field === 'days_until_close') {
    const closeDate = record.expected_close_date as string
    if (!closeDate) return false
    const days = (new Date(closeDate).getTime() - now.getTime()) / 86400000
    if (operator === 'greater_than') return days > numValue
    if (operator === 'less_than') return days < numValue
    return false
  }

  if (field === 'days_overdue') {
    const due = record.due_date as string
    if (!due) return false
    const days = (now.getTime() - new Date(due).getTime()) / 86400000
    if (operator === 'greater_than') return days > numValue
    if (operator === 'less_than') return days < numValue
    return false
  }

  const fieldValue = record[field]

  if (operator === 'equals') return String(fieldValue) === value
  if (operator === 'not_equals') return String(fieldValue) !== value
  if (operator === 'greater_than') return Number(fieldValue) > numValue
  if (operator === 'less_than') return Number(fieldValue) < numValue
  if (operator === 'contains') return String(fieldValue).toLowerCase().includes(value.toLowerCase())

  return false
}

function buildMessage(template: string, record: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(record[key] ?? key))
}

export async function evaluateRules(userId: string): Promise<Alert[]> {
  const supabase = createClient()

  const { data: rules } = await supabase
    .from('rules')
    .select('*')
    .eq('is_active', true)

  if (!rules || rules.length === 0) return []

  const now = new Date()
  const toInsert: Record<string, unknown>[] = []

  for (const rule of rules) {
    const def = rule.definition as RuleDefinition
    if (!def?.entity_type || !def?.conditions?.length) continue

    // Fetch records for this entity
    let records: Record<string, unknown>[] = []

    if (def.entity_type === 'opportunity') {
      const { data } = await supabase
        .from('opportunities')
        .select('id, title, stage, value, updated_at, expected_close_date, owner_id')
      records = (data ?? []) as Record<string, unknown>[]
    } else if (def.entity_type === 'task') {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, updated_at, assigned_to')
      records = (data ?? []) as Record<string, unknown>[]
    } else if (def.entity_type === 'client') {
      const { data } = await supabase
        .from('clients')
        .select('id, name, status, updated_at, owner_id')
      records = (data ?? []) as Record<string, unknown>[]
    }

    // Filter records that match ALL conditions
    const matched = records.filter(r =>
      def.conditions.every(cond => evalCondition(cond, r, now))
    )

    for (const record of matched) {
      const entityName = (record.title ?? record.name ?? '') as string
      const assignedTo = (record.owner_id ?? record.assigned_to ?? null) as string | null
      const message = buildMessage(def.action.message_template, { ...record, name: entityName })

      toInsert.push({
        rule_id: rule.id,
        rule_name: rule.name,
        entity_type: def.entity_type,
        entity_id: record.id,
        entity_name: entityName,
        message,
        severity: def.action.severity,
        is_read: false,
        assigned_to: assignedTo,
      })
    }
  }

  if (toInsert.length === 0) return []

  // Deduplicar: não criar se já existe alerta não lido para este rule+entity
  const { data: existing } = await supabase
    .from('alerts')
    .select('rule_id, entity_id')
    .eq('is_read', false)

  const existingKeys = new Set(
    (existing ?? []).map((a: { rule_id: string; entity_id: string }) => `${a.rule_id}:${a.entity_id}`)
  )

  const fresh = toInsert.filter(a => !existingKeys.has(`${a.rule_id}:${a.entity_id}`))
  if (fresh.length === 0) return []

  const { data: inserted, error } = await supabase.from('alerts').insert(fresh).select()
  if (error) throw new Error(error.message)

  return (inserted ?? []) as Alert[]
}
