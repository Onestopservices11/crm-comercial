import { createClient } from '@/lib/supabase/client'
import { Alert } from '@/types'

export type RuleEntityType = 'opportunity' | 'task' | 'client' | 'comercial'
export type RuleOperator =
  | 'equals' | 'not_equals'
  | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal'
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
  message_template: string
}

export interface RuleDefinition {
  entity_type: RuleEntityType
  conditions: RuleCondition[]
  action: RuleAction
}

export const ENTITY_FIELDS: Record<RuleEntityType, { key: string; label: string; type: 'text' | 'number' | 'days' | 'select' | 'day_of_month' }[]> = {
  opportunity: [
    { key: 'stage',              label: 'Etapa',                  type: 'select' },
    { key: 'value',              label: 'Valor (€)',              type: 'number' },
    { key: 'days_since_update',  label: 'Dias sem atualização',   type: 'days' },
    { key: 'days_until_close',   label: 'Dias até ao fecho',      type: 'days' },
  ],
  task: [
    { key: 'status',      label: 'Estado',       type: 'select' },
    { key: 'priority',    label: 'Prioridade',   type: 'select' },
    { key: 'days_overdue', label: 'Dias em atraso', type: 'days' },
  ],
  client: [
    { key: 'status',             label: 'Estado',                 type: 'select' },
    { key: 'days_since_update',  label: 'Dias sem atualização',   type: 'days' },
  ],
  comercial: [
    { key: 'dia_do_mes',          label: 'Dia do mês (hoje)',      type: 'day_of_month' },
    { key: 'reunioes_este_mes',   label: 'Reuniões este mês',      type: 'number' },
    { key: 'leads_este_mes',      label: 'Leads criados este mês', type: 'number' },
    { key: 'tarefas_em_atraso',   label: 'Tarefas em atraso',      type: 'number' },
    { key: 'oportunidades_ativas', label: 'Oportunidades ativas',  type: 'number' },
    { key: 'valor_pipeline',      label: 'Valor no pipeline (€)',  type: 'number' },
  ],
}

export const FIELD_OPTIONS: Record<string, { value: string; label: string }[]> = {
  'opportunity.stage': [
    { value: 'lead',        label: 'Lead' },
    { value: 'contactado',  label: 'Contactado' },
    { value: 'proposta',    label: 'Proposta' },
    { value: 'negociacao',  label: 'Negociação' },
    { value: 'fecho',       label: 'Fecho' },
    { value: 'perdido',     label: 'Perdido' },
  ],
  'task.status': [
    { value: 'por_fazer',    label: 'Por Fazer' },
    { value: 'em_progresso', label: 'Em Progresso' },
    { value: 'concluida',    label: 'Concluída' },
    { value: 'cancelada',    label: 'Cancelada' },
  ],
  'task.priority': [
    { value: 'baixa',   label: 'Baixa' },
    { value: 'normal',  label: 'Normal' },
    { value: 'alta',    label: 'Alta' },
    { value: 'urgente', label: 'Urgente' },
  ],
  'client.status': [
    { value: 'lead',      label: 'Lead' },
    { value: 'prospect',  label: 'Prospect' },
    { value: 'ativo',     label: 'Ativo' },
    { value: 'inativo',   label: 'Inativo' },
    { value: 'arquivado', label: 'Arquivado' },
  ],
}

export const OPERATORS_FOR_TYPE: Record<string, { value: RuleOperator; label: string }[]> = {
  select: [
    { value: 'equals',     label: 'é igual a' },
    { value: 'not_equals', label: 'é diferente de' },
  ],
  number: [
    { value: 'equals',           label: 'é igual a' },
    { value: 'greater_than',     label: 'é maior que' },
    { value: 'less_than',        label: 'é menor que' },
    { value: 'greater_or_equal', label: 'é maior ou igual a' },
    { value: 'less_or_equal',    label: 'é menor ou igual a' },
  ],
  day_of_month: [
    { value: 'greater_or_equal', label: 'é a partir do dia' },
    { value: 'less_or_equal',    label: 'é até ao dia' },
    { value: 'greater_than',     label: 'é depois do dia' },
    { value: 'less_than',        label: 'é antes do dia' },
  ],
  days: [
    { value: 'greater_than', label: 'mais de X dias' },
    { value: 'less_than',    label: 'menos de X dias' },
  ],
  text: [
    { value: 'equals',   label: 'é igual a' },
    { value: 'contains', label: 'contém' },
  ],
}

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
  const numField = Number(fieldValue)

  if (operator === 'equals')           return String(fieldValue) === value
  if (operator === 'not_equals')       return String(fieldValue) !== value
  if (operator === 'greater_than')     return numField > numValue
  if (operator === 'less_than')        return numField < numValue
  if (operator === 'greater_or_equal') return numField >= numValue
  if (operator === 'less_or_equal')    return numField <= numValue
  if (operator === 'contains')         return String(fieldValue).toLowerCase().includes(value.toLowerCase())
  return false
}

// Calcula métricas por comercial
async function buildComercialRecords(supabase: ReturnType<typeof createClient>, now: Date): Promise<Record<string, unknown>[]> {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  const today      = now.toISOString().split('T')[0]
  const dayOfMonth = now.getDate()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'comercial')

  if (!users?.length) return []

  const records: Record<string, unknown>[] = []

  for (const user of users) {
    const [
      { data: reunioes },
      { data: leads },
      { data: tarefasAtraso },
      { data: oppsAtivas },
    ] = await Promise.all([
      supabase.from('calendar_events')
        .select('id')
        .eq('owner_id', user.id)
        .eq('event_type', 'reuniao')
        .gte('start_at', monthStart)
        .lte('start_at', monthEnd),
      supabase.from('opportunities')
        .select('id')
        .eq('owner_id', user.id)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd),
      supabase.from('tasks')
        .select('id')
        .eq('assigned_to', user.id)
        .in('status', ['por_fazer', 'em_progresso'])
        .lt('due_date', today),
      supabase.from('opportunities')
        .select('id, value')
        .eq('owner_id', user.id)
        .not('stage', 'in', '(fecho,perdido)'),
    ])

    const valorPipeline = (oppsAtivas ?? []).reduce((s, o: Record<string, unknown>) => s + Number(o.value ?? 0), 0)

    records.push({
      id: user.id,
      name: user.full_name,
      owner_id: user.id,
      dia_do_mes: dayOfMonth,
      reunioes_este_mes:   reunioes?.length ?? 0,
      leads_este_mes:      leads?.length ?? 0,
      tarefas_em_atraso:   tarefasAtraso?.length ?? 0,
      oportunidades_ativas: oppsAtivas?.length ?? 0,
      valor_pipeline:      valorPipeline,
    })
  }

  return records
}

function buildMessage(template: string, record: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(record[key] ?? key))
}

export async function evaluateRules(_userId: string): Promise<Alert[]> {
  const supabase = createClient()

  const { data: rules } = await supabase
    .from('rules')
    .select('*')
    .eq('is_active', true)

  if (!rules || rules.length === 0) return []

  const now = new Date()
  const toInsert: Record<string, unknown>[] = []

  // Cache comercial records if any rule needs them
  let comercialRecords: Record<string, unknown>[] | null = null
  const needsComercial = rules.some(r => (r.definition as RuleDefinition)?.entity_type === 'comercial')
  if (needsComercial) {
    comercialRecords = await buildComercialRecords(supabase, now)
  }

  for (const rule of rules) {
    const def = rule.definition as RuleDefinition
    if (!def?.entity_type || !def?.conditions?.length) continue

    let records: Record<string, unknown>[] = []

    if (def.entity_type === 'comercial') {
      records = comercialRecords ?? []
    } else if (def.entity_type === 'opportunity') {
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

    const matched = records.filter(r => def.conditions.every(c => evalCondition(c, r, now)))

    for (const record of matched) {
      const entityName = String(record.title ?? record.name ?? '')
      const assignedTo = String(record.owner_id ?? record.assigned_to ?? '')
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
        assigned_to: assignedTo || null,
      })
    }
  }

  if (toInsert.length === 0) return []

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
