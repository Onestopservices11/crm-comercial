import { createClient } from '@/lib/supabase/client'

export const METRIC_TYPE_LABELS: Record<string, string> = {
  reunioes_este_mes:    'Reuniões mensais',
  leads_este_mes:       'Leads criados',
  valor_pipeline:       'Valor no pipeline',
  oportunidades_ativas: 'Oportunidades ativas',
  tarefas_em_atraso:    'Tarefas em atraso',
}

export async function getCurrentValue(metricType: string, userId: string): Promise<number> {
  const supabase = createClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  const today      = now.toISOString().split('T')[0]

  if (metricType === 'reunioes_este_mes') {
    const { count } = await supabase
      .from('calendar_events')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('event_type', 'reuniao')
      .gte('start_at', monthStart)
      .lte('start_at', monthEnd)
    return count ?? 0
  }

  if (metricType === 'leads_este_mes') {
    const { count } = await supabase
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd)
    return count ?? 0
  }

  if (metricType === 'valor_pipeline') {
    const { data } = await supabase
      .from('opportunities')
      .select('value')
      .eq('owner_id', userId)
      .not('stage', 'in', '(fecho,perdido)')
    return (data ?? []).reduce((s, o) => s + (o.value ?? 0), 0)
  }

  if (metricType === 'oportunidades_ativas') {
    const { count } = await supabase
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .not('stage', 'in', '(fecho,perdido)')
    return count ?? 0
  }

  if (metricType === 'tarefas_em_atraso') {
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .in('status', ['por_fazer', 'em_progresso'])
      .lt('due_date', today)
    return count ?? 0
  }

  return 0
}

export function getProgress(current: number, target: number): number {
  if (target === 0) return 100
  return Math.min(Math.round((current / target) * 100), 100)
}

export function getProgressColor(progress: number, inverse = false): string {
  if (inverse) {
    if (progress === 0) return 'bg-emerald-500'
    if (progress < 50) return 'bg-amber-500'
    return 'bg-red-500'
  }
  if (progress >= 100) return 'bg-emerald-500'
  if (progress >= 70)  return 'bg-amber-500'
  return 'bg-red-500'
}

export function getProgressTextColor(progress: number, inverse = false): string {
  if (inverse) {
    if (progress === 0) return 'text-emerald-600'
    if (progress < 50) return 'text-amber-600'
    return 'text-red-600'
  }
  if (progress >= 100) return 'text-emerald-600'
  if (progress >= 70)  return 'text-amber-600'
  return 'text-red-600'
}

export function periodLabel(periodStart: string): string {
  const d = new Date(periodStart)
  return d.toLocaleString('pt-PT', { month: 'long', year: 'numeric' })
}

export function currentMonthRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end:   end.toISOString().split('T')[0],
  }
}
