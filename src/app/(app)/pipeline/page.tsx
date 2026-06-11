'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Opportunity, PipelineStage } from '@/types'
import { Plus, ChevronRight, ChevronLeft, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { OpportunityModal } from '@/modules/pipeline/opportunity-modal'

const STAGES: { key: PipelineStage; label: string; color: string; dot: string; tab: string; activeCard: string }[] = [
  { key: 'lead',        label: 'Lead',       color: 'bg-slate-50  border-slate-200',   dot: 'bg-slate-400',   tab: 'text-slate-600',   activeCard: 'bg-slate-50 border-slate-300'   },
  { key: 'contactado',  label: 'Contactado', color: 'bg-blue-50   border-blue-200',    dot: 'bg-blue-500',    tab: 'text-blue-600',    activeCard: 'bg-blue-50 border-blue-300'     },
  { key: 'proposta',    label: 'Proposta',   color: 'bg-amber-50  border-amber-200',   dot: 'bg-amber-500',   tab: 'text-amber-600',   activeCard: 'bg-amber-50 border-amber-300'   },
  { key: 'negociacao',  label: 'Negociação', color: 'bg-orange-50 border-orange-200',  dot: 'bg-orange-500',  tab: 'text-orange-600',  activeCard: 'bg-orange-50 border-orange-300' },
  { key: 'fecho',       label: 'Fecho',      color: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', tab: 'text-emerald-600', activeCard: 'bg-emerald-50 border-emerald-300' },
  { key: 'perdido',     label: 'Perdido',    color: 'bg-red-50    border-red-200',     dot: 'bg-red-400',     tab: 'text-red-500',     activeCard: 'bg-red-50 border-red-300'       },
]

export default function PipelinePage() {
  const { user } = useAuth()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStage, setActiveStage] = useState<PipelineStage>('lead')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Opportunity | null>(null)
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from('opportunities')
      .select('*, client:clients(id,name), owner:profiles(id,full_name)')
      .order('created_at', { ascending: false })
    setOpportunities(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const byStage = (stage: PipelineStage) => opportunities.filter(o => o.stage === stage)
  const activeItems = byStage(activeStage)
  const activeConfig = STAGES.find(s => s.key === activeStage)!
  const totalValue = opportunities.filter(o => o.stage !== 'perdido').reduce((s, o) => s + o.value, 0)
  const activeIdx = STAGES.findIndex(s => s.key === activeStage)

  const moveStage = async (id: string, stage: PipelineStage) => {
    await supabase.from('opportunities').update({ stage }).eq('id', id)
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, stage } : o))
  }

  const deleteOpp = async (id: string) => {
    if (!confirm('Apagar esta oportunidade?')) return
    await supabase.from('opportunities').delete().eq('id', id)
    setOpportunities(prev => prev.filter(o => o.id !== id))
  }

  return (
    <div>
      <PageHeader
        title="Pipeline de Vendas"
        description={`${opportunities.filter(o => o.stage !== 'perdido').length} oportunidades · ${formatCurrency(totalValue)}`}
        action={
          <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={16} /> Nova Oportunidade
          </Button>
        }
      />

      {/* Resumo por etapa */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
        {STAGES.map(stage => {
          const items = byStage(stage.key)
          const val = items.reduce((s, o) => s + o.value, 0)
          const active = activeStage === stage.key
          return (
            <button
              key={stage.key}
              onClick={() => setActiveStage(stage.key)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                active
                  ? `${stage.activeCard} shadow-sm`
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${stage.dot}`} />
                <span className="text-xs font-semibold text-slate-700 truncate">{stage.label}</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{items.length}</p>
              {val > 0 && <p className="text-xs text-slate-500 truncate mt-0.5">{formatCurrency(val)}</p>}
            </button>
          )
        })}
      </div>

      {/* Lista de oportunidades da etapa activa */}
      <div className={`rounded-2xl border-2 ${activeConfig.activeCard} p-4`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${activeConfig.dot}`} />
            <h2 className="font-semibold text-slate-800">{activeConfig.label}</h2>
            <span className="text-sm text-slate-500">({activeItems.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => activeIdx > 0 && setActiveStage(STAGES[activeIdx - 1].key)}
              disabled={activeIdx === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => activeIdx < STAGES.length - 1 && setActiveStage(STAGES[activeIdx + 1].key)}
              disabled={activeIdx === STAGES.length - 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : activeItems.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center mx-auto mb-3">
              <TrendingUp size={22} className="text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium text-sm">Nenhuma oportunidade em {activeConfig.label}</p>
            <Button className="mt-3" size="sm" onClick={() => { setEditing(null); setModalOpen(true) }}>
              <Plus size={14} /> Adicionar
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {activeItems.map(opp => {
              const prevStage = activeIdx > 0 ? STAGES[activeIdx - 1] : null
              const nextStage = activeIdx < STAGES.length - 1 ? STAGES[activeIdx + 1] : null
              return (
                <div
                  key={opp.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-md transition-shadow"
                >
                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{opp.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      {opp.client && <span className="text-xs text-slate-600 font-medium">{opp.client.name}</span>}
                      {opp.expected_close_date && (
                        <span className="text-xs text-slate-400">Fecho: {formatDate(opp.expected_close_date)}</span>
                      )}
                      {opp.owner && <span className="text-xs text-slate-400">{opp.owner.full_name}</span>}
                    </div>
                  </div>

                  {/* Valor */}
                  <p className="text-lg font-bold text-slate-900 shrink-0">{formatCurrency(opp.value)}</p>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {prevStage && (
                      <button
                        onClick={() => moveStage(opp.id, prevStage.key)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        title={`Mover para ${prevStage.label}`}
                      >
                        <ChevronLeft size={12} /> {prevStage.label}
                      </button>
                    )}
                    {nextStage && (
                      <button
                        onClick={() => moveStage(opp.id, nextStage.key)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white rounded-lg transition-colors ${nextStage.dot.replace('bg-', 'bg-')} hover:opacity-90`}
                        style={{}}
                        title={`Mover para ${nextStage.label}`}
                      >
                        {nextStage.label} <ChevronRight size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => { setEditing(opp); setModalOpen(true) }}
                      className="px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteOpp(opp.id)}
                      className="px-2.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      Apagar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <OpportunityModal
          opportunity={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load() }}
        />
      )}
    </div>
  )
}
