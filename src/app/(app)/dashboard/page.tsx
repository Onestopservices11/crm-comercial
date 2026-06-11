'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Users, CheckSquare, FileEdit, DollarSign, UserCircle, Calendar, ArrowRight } from 'lucide-react'
import { formatCurrency, formatDate, roleLabel, isDirector } from '@/lib/utils'
import Link from 'next/link'
import { evaluateRules } from '@/lib/rules-engine'

interface DashboardData {
  totalClientes: number
  clientesAtivos: number
  totalOportunidades: number
  valorPipeline: number
  tarefasPendentes: number
  tarefasHoje: { id: string; title: string; priority: string; status: string }[]
  propostas: number
  comissoesPendentes: number
  valorComissoesPendentes: number
  pipelinePorEtapa: { stage: string; count: number; value: number }[]
  eventosHoje: { id: string; title: string; event_type: string; start_at: string }[]
  oportunidadesRecentes: { id: string; title: string; stage: string; value: number; client?: { name: string } }[]
}

const stageLabel: Record<string, string> = {
  lead: 'Lead', contactado: 'Contactado', proposta: 'Proposta',
  negociacao: 'Negociação', fecho: 'Fecho', perdido: 'Perdido',
}

const stageColor: Record<string, string> = {
  lead: 'bg-gray-400', contactado: 'bg-blue-500', proposta: 'bg-yellow-500',
  negociacao: 'bg-orange-500', fecho: 'bg-green-500', perdido: 'bg-red-400',
}

const priorityColor: Record<string, string> = {
  baixa: 'bg-gray-400', normal: 'bg-blue-400', alta: 'bg-orange-500', urgente: 'bg-red-500',
}

const eventTypeLabel: Record<string, string> = {
  reuniao: 'Reunião', chamada: 'Chamada', visita: 'Visita', demo: 'Demo', outro: 'Outro',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const today = new Date()
      const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString()
      const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString()

      // Filtro por owner se for comercial
      const isComercial = user.role === 'comercial'

      const [
        { data: clientes },
        { data: oportunidades },
        { data: tarefas },
        { data: propostas },
        { data: comissoes },
        { data: eventos },
      ] = await Promise.all([
        supabase.from('clients').select('id, status').then(q => isComercial ? supabase.from('clients').select('id, status').eq('owner_id', user.id) : supabase.from('clients').select('id, status')),
        supabase.from('opportunities').select('id, stage, value, title, client:clients(name)').then(q => isComercial ? supabase.from('opportunities').select('id, stage, value, title, client:clients(name)').eq('owner_id', user.id) : supabase.from('opportunities').select('id, stage, value, title, client:clients(name)')),
        supabase.from('tasks').select('id, title, priority, status, due_date').then(q => isComercial ? supabase.from('tasks').select('id, title, priority, status, due_date').eq('assigned_to', user.id) : supabase.from('tasks').select('id, title, priority, status, due_date')),
        supabase.from('proposals').select('id, status').then(q => isComercial ? supabase.from('proposals').select('id, status').eq('owner_id', user.id) : supabase.from('proposals').select('id, status')),
        supabase.from('commissions').select('id, amount, status').then(q => isComercial ? supabase.from('commissions').select('id, amount, status').eq('user_id', user.id) : supabase.from('commissions').select('id, amount, status')),
        supabase.from('calendar_events').select('id, title, event_type, start_at').gte('start_at', todayStart).lte('start_at', todayEnd).then(q => isComercial ? supabase.from('calendar_events').select('id, title, event_type, start_at').gte('start_at', todayStart).lte('start_at', todayEnd).eq('owner_id', user.id) : supabase.from('calendar_events').select('id, title, event_type, start_at').gte('start_at', todayStart).lte('start_at', todayEnd)),
      ])

      const opps = oportunidades ?? []
      const tasks = tarefas ?? []
      const comms = comissoes ?? []

      setData({
        totalClientes: clientes?.length ?? 0,
        clientesAtivos: clientes?.filter(c => c.status === 'ativo').length ?? 0,
        totalOportunidades: opps.filter(o => o.stage !== 'perdido').length,
        valorPipeline: opps.filter(o => !['perdido', 'fecho'].includes(o.stage)).reduce((s, o) => s + (o.value ?? 0), 0),
        tarefasPendentes: tasks.filter(t => t.status === 'por_fazer' || t.status === 'em_progresso').length,
        tarefasHoje: tasks.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').slice(0, 5),
        propostas: propostas?.filter(p => ['enviada', 'negociacao'].includes(p.status)).length ?? 0,
        comissoesPendentes: comms.filter(c => c.status === 'pendente').length,
        valorComissoesPendentes: comms.filter(c => c.status === 'pendente').reduce((s, c) => s + (c.amount ?? 0), 0),
        pipelinePorEtapa: ['lead', 'contactado', 'proposta', 'negociacao', 'fecho'].map(stage => ({
          stage,
          count: opps.filter(o => o.stage === stage).length,
          value: opps.filter(o => o.stage === stage).reduce((s, o) => s + (o.value ?? 0), 0),
        })),
        eventosHoje: eventos ?? [],
        oportunidadesRecentes: opps.filter(o => o.stage !== 'perdido').slice(0, 5).map(o => ({ ...o, client: Array.isArray(o.client) ? o.client[0] : o.client })) as DashboardData['oportunidadesRecentes'],
      })
      setLoading(false)
      // Avaliar regras em background (silencioso)
      evaluateRules(user.id).catch(() => {})
    }
    load()
  }, [user])

  if (loading || !data) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  const stats = [
    { label: 'Clientes Ativos',      value: data.clientesAtivos,                    sub: `${data.totalClientes} total`,           icon: UserCircle,  color: 'text-blue-600',   bg: 'bg-blue-500',    href: '/clientes' },
    { label: 'Pipeline Ativo',       value: formatCurrency(data.valorPipeline),     sub: `${data.totalOportunidades} oportunidades`, icon: TrendingUp,  color: 'text-emerald-600', bg: 'bg-emerald-500', href: '/pipeline' },
    { label: 'Tarefas Pendentes',    value: data.tarefasPendentes,                  sub: 'por fazer / em progresso',               icon: CheckSquare, color: 'text-amber-600',  bg: 'bg-amber-500',   href: '/tarefas' },
    { label: 'Propostas Abertas',    value: data.propostas,                         sub: 'enviadas / negociação',                  icon: FileEdit,    color: 'text-purple-600', bg: 'bg-purple-500',  href: '/propostas' },
    { label: 'Comissões Pendentes',  value: formatCurrency(data.valorComissoesPendentes), sub: `${data.comissoesPendentes} por aprovar`, icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-500', href: '/comissoes' },
    { label: 'Eventos Hoje',         value: data.eventosHoje.length,                sub: new Date().toLocaleDateString('pt-PT', { weekday: 'long' }), icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-500', href: '/agenda' },
  ]

  const today = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Olá, {user?.full_name.split(' ')[0]} 👋</h1>
        <p className="text-sm text-slate-500 mt-0.5 capitalize">{roleLabel(user!.role)} · {today}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Link key={s.label} href={s.href}>
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className={`rounded-xl p-2 ${s.bg}`}>
                    <Icon size={16} className="text-white" />
                  </div>
                  <ArrowRight size={14} className="text-slate-300 mt-1" />
                </div>
                <p className="text-2xl font-bold text-slate-900 leading-none mb-1">{s.value}</p>
                <p className="text-xs font-medium text-slate-600">{s.label}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{s.sub}</p>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Pipeline por etapa */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-900">Pipeline</h3>
              <p className="text-xs text-slate-400 mt-0.5">Valor por etapa</p>
            </div>
            <Link href="/pipeline" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              Ver tudo <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {data.pipelinePorEtapa.map(item => {
              const maxVal = Math.max(...data.pipelinePorEtapa.map(i => i.value), 1)
              const pct = Math.round((item.value / maxVal) * 100)
              return (
                <div key={item.stage}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${stageColor[item.stage]}`} />
                      <span className="text-xs font-medium text-slate-600">{stageLabel[item.stage]}</span>
                      <span className="text-xs text-slate-400">({item.count})</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${stageColor[item.stage]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {data.pipelinePorEtapa.every(i => i.count === 0) && (
              <p className="text-sm text-slate-400 text-center py-6">Sem oportunidades no pipeline.</p>
            )}
          </div>
        </div>

        {/* Tarefas pendentes */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-900">Tarefas Pendentes</h3>
              <p className="text-xs text-slate-400 mt-0.5">{data.tarefasPendentes} por concluir</p>
            </div>
            <Link href="/tarefas" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              Ver tudo <ArrowRight size={12} />
            </Link>
          </div>
          {data.tarefasHoje.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CheckSquare size={22} className="text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-slate-700">Tudo em dia!</p>
              <p className="text-xs text-slate-400 mt-1">Sem tarefas pendentes.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {data.tarefasHoje.map(task => (
                <Link key={task.id} href="/tarefas">
                  <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors group">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${priorityColor[task.priority]}`} />
                    <span className="text-sm text-slate-700 flex-1 truncate group-hover:text-slate-900">{task.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      task.status === 'em_progresso' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {task.status === 'em_progresso' ? 'Em progresso' : 'Por fazer'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Eventos de hoje */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-900">Agenda de Hoje</h3>
              <p className="text-xs text-slate-400 mt-0.5 capitalize">{today}</p>
            </div>
            <Link href="/agenda" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              Ver agenda <ArrowRight size={12} />
            </Link>
          </div>
          {data.eventosHoje.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Calendar size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700">Dia livre</p>
              <p className="text-xs text-slate-400 mt-1">Sem eventos agendados.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.eventosHoje.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50">
                  <div className="shrink-0 text-center w-12">
                    <p className="text-xs font-bold text-slate-900">
                      {new Date(ev.start_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-slate-200 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{ev.title}</p>
                    <p className="text-xs text-slate-400">{eventTypeLabel[ev.event_type]}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Oportunidades recentes */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-slate-900">Oportunidades Recentes</h3>
              <p className="text-xs text-slate-400 mt-0.5">{data.totalOportunidades} ativas</p>
            </div>
            <Link href="/pipeline" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              Ver pipeline <ArrowRight size={12} />
            </Link>
          </div>
          {data.oportunidadesRecentes.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700">Sem oportunidades</p>
              <p className="text-xs text-slate-400 mt-1">Cria a primeira no pipeline.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {data.oportunidadesRecentes.map(opp => (
                <Link key={opp.id} href="/pipeline">
                  <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors group">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${stageColor[opp.stage]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-slate-900">{opp.title}</p>
                      {opp.client && <p className="text-xs text-slate-400 truncate">{opp.client.name}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(opp.value)}</p>
                      <p className="text-xs text-slate-400">{stageLabel[opp.stage]}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
