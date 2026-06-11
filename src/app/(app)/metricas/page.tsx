'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MetricDefinition, MetricAssignment, UserProfile } from '@/types'
import { Plus, Target, Pencil, Trash2, Users, TrendingUp } from 'lucide-react'
import { MetricDefModal } from '@/modules/metricas/metric-def-modal'
import { AssignModal } from '@/modules/metricas/assign-modal'
import {
  getCurrentValue, getProgress, getProgressColor, getProgressTextColor,
  periodLabel, currentMonthRange, METRIC_TYPE_LABELS,
} from '@/lib/metrics-engine'

interface LiveMetric extends MetricAssignment {
  current: number
  progress: number
}

export default function MetricasPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [definitions, setDefinitions]     = useState<MetricDefinition[]>([])
  const [assignments, setAssignments]     = useState<LiveMetric[]>([])
  const [loading, setLoading]             = useState(true)
  const [defModalOpen, setDefModalOpen]   = useState(false)
  const [editingDef, setEditingDef]       = useState<MetricDefinition | null>(null)
  const [assignModal, setAssignModal]     = useState<MetricDefinition | null>(null)
  const [myMetrics, setMyMetrics]         = useState<LiveMetric[]>([])

  const isAdmin    = user?.role === 'admin'
  const isDirector = user?.role === 'diretor_comercial'
  const isComercial = user?.role === 'comercial'

  const { start, end } = currentMonthRange()

  const loadDefinitions = async () => {
    const { data } = await supabase
      .from('metric_definitions')
      .select('*')
      .eq('is_active', true)
      .order('created_at')
    setDefinitions((data ?? []) as MetricDefinition[])
  }

  const loadAssignments = async () => {
    if (!user) return
    setLoading(true)

    if (isComercial) {
      const { data } = await supabase
        .from('metric_assignments')
        .select('*, metric:metric_definitions(*)')
        .eq('assigned_to', user.id)
        .eq('period_start', start)
      const rows = (data ?? []) as MetricAssignment[]
      const live = await Promise.all(rows.map(async r => ({
        ...r,
        current:  await getCurrentValue(r.metric!.metric_type, user.id),
        progress: 0,
      })))
      live.forEach(r => { r.progress = getProgress(r.current, r.target) })
      setMyMetrics(live)
    } else {
      // Admin / Diretor — ver todos os assignments do mês
      const { data } = await supabase
        .from('metric_assignments')
        .select('*, metric:metric_definitions(*), user:profiles(*)')
        .eq('period_start', start)
        .order('created_at')
      const rows = (data ?? []) as (MetricAssignment & { user: UserProfile })[]
      const live = await Promise.all(rows.map(async r => ({
        ...r,
        current:  await getCurrentValue(r.metric!.metric_type, r.assigned_to),
        progress: 0,
      })))
      live.forEach(r => { r.progress = getProgress(r.current, r.target) })
      setAssignments(live)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadDefinitions()
    loadAssignments()
  }, [user])

  const deleteDef = async (id: string) => {
    if (!confirm('Apagar esta métrica? Os targets atribuídos também serão apagados.')) return
    await supabase.from('metric_definitions').delete().eq('id', id)
    loadDefinitions()
  }

  // Group assignments by metric for the team view
  const byMetric = definitions.map(def => ({
    def,
    rows: assignments.filter(a => a.metric_id === def.id),
  })).filter(g => g.rows.length > 0 || isAdmin)

  return (
    <div>
      <PageHeader
        title="Métricas e Objetivos"
        description={`${periodLabel(start)} · Acompanha os objetivos da equipa`}
        action={
          isAdmin ? (
            <Button onClick={() => { setEditingDef(null); setDefModalOpen(true) }}>
              <Plus size={16} /> Nova Métrica
            </Button>
          ) : undefined
        }
      />

      {/* ── COMERCIAL — as suas métricas ── */}
      {isComercial && (
        loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : myMetrics.length === 0 ? (
          <Card><CardBody className="text-center py-12">
            <Target size={28} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Sem objetivos atribuídos este mês</p>
            <p className="text-slate-400 text-sm mt-1">O teu diretor ainda não definiu targets para ti.</p>
          </CardBody></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myMetrics.map(m => (
              <MetricCard key={m.id} metric={m} />
            ))}
          </div>
        )
      )}

      {/* ── ADMIN — definições + equipa ── */}
      {(isAdmin || isDirector) && (
        <div className="space-y-8">

          {/* Definições (só admin) */}
          {isAdmin && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
                Métricas definidas
              </h2>
              {definitions.length === 0 ? (
                <Card><CardBody className="text-center py-10">
                  <p className="text-slate-400 text-sm">Nenhuma métrica criada.</p>
                  <Button className="mt-3" size="sm" onClick={() => { setEditingDef(null); setDefModalOpen(true) }}>
                    <Plus size={14} /> Criar primeira métrica
                  </Button>
                </CardBody></Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {definitions.map(def => (
                    <Card key={def.id}>
                      <CardBody className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <TrendingUp size={18} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{def.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {METRIC_TYPE_LABELS[def.metric_type] ?? def.metric_type}
                            {' · '}Target padrão: {def.default_target} {def.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setAssignModal(def)}
                            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Distribuir pela equipa"
                          >
                            <Users size={15} />
                          </button>
                          <button
                            onClick={() => { setEditingDef(def); setDefModalOpen(true) }}
                            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => deleteDef(def.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vista de equipa — por métrica */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Progresso da equipa — {periodLabel(start)}
            </h2>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : assignments.length === 0 ? (
              <Card><CardBody className="text-center py-10">
                <Users size={28} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Sem targets atribuídos este mês</p>
                {isAdmin && (
                  <p className="text-slate-400 text-sm mt-1">Usa o ícone <Users size={12} className="inline" /> em cada métrica para distribuir pela equipa.</p>
                )}
                {isDirector && (
                  <p className="text-slate-400 text-sm mt-1">Contacta o admin para definir métricas primeiro.</p>
                )}
              </CardBody></Card>
            ) : (
              <div className="space-y-6">
                {byMetric.filter(g => g.rows.length > 0).map(({ def, rows }) => (
                  <div key={def.id}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-800">{def.name}</h3>
                      {isDirector && (
                        <button
                          onClick={() => setAssignModal(def)}
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <Users size={13} /> Editar targets
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {rows.map(m => (
                        <TeamMetricCard key={m.id} metric={m} unit={def.unit} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {defModalOpen && (
        <MetricDefModal
          metric={editingDef}
          onClose={() => setDefModalOpen(false)}
          onSaved={() => { setDefModalOpen(false); loadDefinitions() }}
        />
      )}

      {assignModal && (
        <AssignModal
          metric={assignModal}
          onClose={() => setAssignModal(null)}
          onSaved={() => { setAssignModal(null); loadAssignments() }}
        />
      )}
    </div>
  )
}

function MetricCard({ metric }: { metric: LiveMetric }) {
  const def = metric.metric as MetricDefinition
  const isInverse = def?.metric_type === 'tarefas_em_atraso'
  const progress = metric.progress
  const barColor = getProgressColor(progress, isInverse)
  const textColor = getProgressTextColor(progress, isInverse)

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between mb-3">
          <p className="font-semibold text-slate-900 text-sm">{def?.name}</p>
          <span className={`text-xs font-bold ${textColor}`}>{progress}%</span>
        </div>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-3xl font-bold text-slate-900">{metric.current.toLocaleString('pt-PT')}</span>
          <span className="text-sm text-slate-400 mb-1">/ {metric.target.toLocaleString('pt-PT')} {def?.unit}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {progress >= 100 ? '✓ Objetivo atingido' : `Faltam ${Math.max(0, metric.target - metric.current).toLocaleString('pt-PT')} ${def?.unit ?? ''}`}
        </p>
      </CardBody>
    </Card>
  )
}

function TeamMetricCard({ metric, unit }: { metric: LiveMetric; unit: string }) {
  const u = metric.user as UserProfile | undefined
  const isInverse = false
  const progress = metric.progress
  const barColor = getProgressColor(progress, isInverse)
  const textColor = getProgressTextColor(progress, isInverse)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-blue-600">
            {u?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </span>
        </div>
        <p className="font-medium text-slate-800 text-sm truncate">{u?.full_name ?? '—'}</p>
        <span className={`ml-auto text-xs font-bold shrink-0 ${textColor}`}>{progress}%</span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-xl font-bold text-slate-900">{metric.current.toLocaleString('pt-PT')}</span>
        <span className="text-xs text-slate-400">/ {metric.target.toLocaleString('pt-PT')} {unit}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
