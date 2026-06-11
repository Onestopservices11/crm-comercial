'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Opportunity, PipelineStage, UserProfile } from '@/types'
import { Plus, ChevronRight, ChevronLeft, TrendingUp, Users } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { OpportunityModal } from '@/modules/pipeline/opportunity-modal'

const STAGES: { key: PipelineStage; label: string; dot: string; activeCard: string }[] = [
  { key: 'lead',       label: 'Lead',       dot: 'bg-slate-400',   activeCard: 'bg-slate-50 border-slate-300'    },
  { key: 'contactado', label: 'Contactado', dot: 'bg-blue-500',    activeCard: 'bg-blue-50 border-blue-300'      },
  { key: 'proposta',   label: 'Proposta',   dot: 'bg-amber-500',   activeCard: 'bg-amber-50 border-amber-300'    },
  { key: 'negociacao', label: 'Negociação', dot: 'bg-orange-500',  activeCard: 'bg-orange-50 border-orange-300'  },
  { key: 'fecho',      label: 'Fecho',      dot: 'bg-emerald-500', activeCard: 'bg-emerald-50 border-emerald-300'},
  { key: 'perdido',    label: 'Perdido',    dot: 'bg-red-400',     activeCard: 'bg-red-50 border-red-300'        },
]

export default function PipelinePage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading]             = useState(true)
  const [activeStage, setActiveStage]     = useState<PipelineStage>('lead')
  const [modalOpen, setModalOpen]         = useState(false)
  const [editing, setEditing]             = useState<Opportunity | null>(null)

  // Seletor de utilizador (admin/diretor)
  const [teamUsers, setTeamUsers]   = useState<Pick<UserProfile, 'id' | 'full_name'>[]>([])
  const [viewUserId, setViewUserId] = useState<string | 'all'>('all')

  const isAdmin    = user?.role === 'admin'
  const isDirector = user?.role === 'diretor_comercial'
  const canSeeTeam = isAdmin || isDirector

  useEffect(() => {
    if (!user) return
    if (canSeeTeam) loadTeamUsers()
    load()
  }, [user])

  useEffect(() => {
    if (user) load()
  }, [viewUserId])

  const loadTeamUsers = async () => {
    if (isAdmin) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('active', true)
        .order('full_name')
      setTeamUsers(data ?? [])
    } else {
      // diretor: busca membros da sua equipa
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('director_id', user!.id)
      const teamIds = (teams ?? []).map(t => t.id)
      if (teamIds.length === 0) return
      const { data: members } = await supabase
        .from('team_members')
        .select('user:profiles(id,full_name)')
        .in('team_id', teamIds)
      const users = (members ?? []).flatMap((m: { user: { id: string; full_name: string }[] | { id: string; full_name: string } | null }) => Array.isArray(m.user) ? m.user : m.user ? [m.user] : []) as Pick<UserProfile, 'id' | 'full_name'>[]
      setTeamUsers(users)
    }
  }

  const load = async () => {
    if (!user) return
    setLoading(true)
    let query = supabase
      .from('opportunities')
      .select('*, client:clients(id,name), owner:profiles(id,full_name)')
      .order('created_at', { ascending: false })

    if (canSeeTeam) {
      if (viewUserId !== 'all') query = query.eq('owner_id', viewUserId)
    } else {
      query = query.eq('owner_id', user.id)
    }

    const { data } = await query
    setOpportunities((data ?? []) as Opportunity[])
    setLoading(false)
  }

  const byStage  = (stage: PipelineStage) => opportunities.filter(o => o.stage === stage)
  const activeItems  = byStage(activeStage)
  const activeConfig = STAGES.find(s => s.key === activeStage)!
  const activeIdx    = STAGES.findIndex(s => s.key === activeStage)
  const totalValue   = opportunities.filter(o => o.stage !== 'perdido').reduce((s, o) => s + o.value, 0)
  const activeCount  = opportunities.filter(o => o.stage !== 'perdido').length

  const viewingName = viewUserId === 'all'
    ? 'Toda a equipa'
    : teamUsers.find(u => u.id === viewUserId)?.full_name ?? 'Utilizador'

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
        description={`${activeCount} oportunidades · ${formatCurrency(totalValue)}`}
        action={
          <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={16} /> Nova Oportunidade
          </Button>
        }
      />

      {/* Seletor de pessoa — só para admin e diretor */}
      {canSeeTeam && teamUsers.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Users size={14} className="text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 shrink-0">Ver pipeline de:</span>
          <button
            onClick={() => setViewUserId('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              viewUserId === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
          {teamUsers.map(u => (
            <button
              key={u.id}
              onClick={() => setViewUserId(u.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                viewUserId === u.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {u.full_name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Resumo por etapa */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
        {STAGES.map(stage => {
          const items = byStage(stage.key)
          const val   = items.reduce((s, o) => s + o.value, 0)
          const active = activeStage === stage.key
          return (
            <button
              key={stage.key}
              onClick={() => setActiveStage(stage.key)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                active ? `${stage.activeCard} shadow-sm` : 'bg-white border-slate-200 hover:border-slate-300'
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

      {/* Lista da etapa activa */}
      <div className={`rounded-2xl border-2 ${activeConfig.activeCard} p-4`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`w-3 h-3 rounded-full ${activeConfig.dot}`} />
            <h2 className="font-semibold text-slate-800">{activeConfig.label}</h2>
            <span className="text-sm text-slate-500">({activeItems.length})</span>
            {canSeeTeam && (
              <span className="text-xs text-slate-400 ml-1">— {viewingName}</span>
            )}
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
                <div key={opp.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-md transition-shadow">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{opp.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      {opp.client && <span className="text-xs text-slate-600 font-medium">{(opp.client as { name: string }).name}</span>}
                      {opp.expected_close_date && <span className="text-xs text-slate-400">Fecho: {formatDate(opp.expected_close_date)}</span>}
                      {canSeeTeam && opp.owner && <span className="text-xs text-slate-400">{(opp.owner as { full_name: string }).full_name}</span>}
                    </div>
                  </div>
                  <p className="text-lg font-bold text-slate-900 shrink-0">{formatCurrency(opp.value)}</p>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {prevStage && (
                      <button onClick={() => moveStage(opp.id, prevStage.key)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                        <ChevronLeft size={12} /> {prevStage.label}
                      </button>
                    )}
                    {nextStage && (
                      <button onClick={() => moveStage(opp.id, nextStage.key)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                        {nextStage.label} <ChevronRight size={12} />
                      </button>
                    )}
                    <button onClick={() => { setEditing(opp); setModalOpen(true) }}
                      className="px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                      Abrir
                    </button>
                    <button onClick={() => deleteOpp(opp.id)}
                      className="px-2.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
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
