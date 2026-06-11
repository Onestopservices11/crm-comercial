'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Opportunity, Client, PipelineStage, Proposal, Task, Invoice } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  X, Plus, Trash2, FileEdit, CheckSquare, FileText,
  ChevronRight, Circle, CheckCircle2, Clock,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Props {
  opportunity: Opportunity | null
  onClose: () => void
  onSaved: () => void
}

const TABS = ['Detalhes', 'Propostas', 'Tarefas', 'Faturas'] as const
type Tab = typeof TABS[number]

const stageOptions = [
  { value: 'lead',       label: 'Lead' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'proposta',   label: 'Proposta' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'fecho',      label: 'Fecho' },
  { value: 'perdido',    label: 'Perdido' },
]

const proposalStatusBadge: Record<string, { label: string; variant: 'default'|'info'|'success'|'warning'|'danger' }> = {
  rascunho:   { label: 'Rascunho',   variant: 'default' },
  enviada:    { label: 'Enviada',    variant: 'info' },
  negociacao: { label: 'Negociação', variant: 'warning' },
  aceite:     { label: 'Aceite',     variant: 'success' },
  recusada:   { label: 'Recusada',   variant: 'danger' },
}

const invoiceStatusBadge: Record<string, { label: string; variant: 'default'|'info'|'success'|'warning'|'danger' }> = {
  emitida:   { label: 'Emitida',   variant: 'default' },
  enviada:   { label: 'Enviada',   variant: 'info' },
  paga:      { label: 'Paga',      variant: 'success' },
  em_atraso: { label: 'Em atraso', variant: 'danger' },
}

const taskStatusIcon: Record<string, React.ElementType> = {
  por_fazer:    Circle,
  em_progresso: Clock,
  concluida:    CheckCircle2,
  cancelada:    X,
}

export function OpportunityModal({ opportunity, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const supabase = createClient()

  const [tab, setTab]           = useState<Tab>('Detalhes')
  const [title, setTitle]       = useState(opportunity?.title ?? '')
  const [clientId, setClientId] = useState(opportunity?.client_id ?? '')
  const [stage, setStage]       = useState<PipelineStage>(opportunity?.stage ?? 'lead')
  const [value, setValue]       = useState(String(opportunity?.value ?? ''))
  const [closeDate, setCloseDate] = useState(opportunity?.expected_close_date ?? '')
  const [notes, setNotes]       = useState(opportunity?.notes ?? '')
  const [clients, setClients]   = useState<Pick<Client, 'id' | 'name'>[]>([])
  const [saving, setSaving]     = useState(false)

  // Sub-docs
  const [proposals, setProposals]   = useState<Proposal[]>([])
  const [tasks, setTasks]           = useState<Task[]>([])
  const [invoices, setInvoices]     = useState<Invoice[]>([])
  const [editingProposal, setEditingProposal] = useState<Partial<Proposal> | null>(null)
  const [editingTask, setEditingTask]         = useState<Partial<Task> | null>(null)
  const [editingInvoice, setEditingInvoice]   = useState<Partial<Invoice> | null>(null)

  useEffect(() => {
    supabase.from('clients').select('id,name').order('name').then(({ data }) => setClients(data ?? []))
    if (opportunity?.id) {
      loadProposals()
      loadTasks()
      loadInvoices()
    }
  }, [opportunity?.id])

  const loadProposals = async () => {
    if (!opportunity?.id) return
    const { data } = await supabase.from('proposals').select('*').eq('opportunity_id', opportunity.id).order('created_at', { ascending: false })
    setProposals((data ?? []) as Proposal[])
  }
  const loadTasks = async () => {
    if (!opportunity?.id) return
    const { data } = await supabase.from('tasks').select('*').eq('opportunity_id', opportunity.id).order('due_date', { ascending: true, nullsFirst: false })
    setTasks((data ?? []) as Task[])
  }
  const loadInvoices = async () => {
    if (!opportunity?.id) return
    const { data } = await supabase.from('invoices').select('*').eq('opportunity_id', opportunity.id).order('issued_at', { ascending: false })
    setInvoices((data ?? []) as Invoice[])
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    const payload = {
      title, client_id: clientId || null, stage,
      value: parseFloat(value) || 0,
      expected_close_date: closeDate || null,
      notes: notes || null,
      owner_id: opportunity?.owner_id ?? user?.id,
    }
    if (opportunity) {
      await supabase.from('opportunities').update(payload).eq('id', opportunity.id)
    } else {
      await supabase.from('opportunities').insert(payload)
    }
    setSaving(false)
    onSaved()
  }

  // ── PROPOSALS ──
  const saveProposal = async () => {
    if (!editingProposal?.title?.trim() || !opportunity?.id) return
    const payload = {
      title: editingProposal.title,
      client_id: clientId || opportunity.client_id || null,
      opportunity_id: opportunity.id,
      status: editingProposal.status ?? 'rascunho',
      valid_until: editingProposal.valid_until || null,
      content: { services: (editingProposal.content as Record<string,string>)?.services ?? '', conditions: (editingProposal.content as Record<string,string>)?.conditions ?? '' },
      owner_id: user?.id,
      version: editingProposal.id ? (editingProposal.version ?? 1) + 1 : 1,
    }
    if (editingProposal.id) {
      await supabase.from('proposals').update(payload).eq('id', editingProposal.id)
    } else {
      await supabase.from('proposals').insert(payload)
    }
    setEditingProposal(null)
    loadProposals()
  }

  const deleteProposal = async (id: string) => {
    if (!confirm('Apagar esta proposta?')) return
    await supabase.from('proposals').delete().eq('id', id)
    loadProposals()
  }

  // ── TASKS ──
  const saveTask = async () => {
    if (!editingTask?.title?.trim() || !opportunity?.id) return
    const payload = {
      title: editingTask.title,
      opportunity_id: opportunity.id,
      client_id: clientId || opportunity.client_id || null,
      status: editingTask.status ?? 'por_fazer',
      priority: editingTask.priority ?? 'normal',
      due_date: editingTask.due_date || null,
      description: editingTask.description || null,
      assigned_to: editingTask.assigned_to ?? user?.id,
      created_by: user?.id,
    }
    if (editingTask.id) {
      await supabase.from('tasks').update(payload).eq('id', editingTask.id)
    } else {
      await supabase.from('tasks').insert(payload)
    }
    setEditingTask(null)
    loadTasks()
  }

  const toggleTask = async (task: Task) => {
    const next = task.status === 'concluida' ? 'por_fazer' : 'concluida'
    await supabase.from('tasks').update({ status: next }).eq('id', task.id)
    loadTasks()
  }

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id)
    loadTasks()
  }

  // ── INVOICES ──
  const saveInvoice = async () => {
    if (!editingInvoice?.number?.trim() || !opportunity?.id) return
    const payload = {
      opportunity_id: opportunity.id,
      user_id: user?.id,
      number: editingInvoice.number,
      amount: parseFloat(String(editingInvoice.amount ?? 0)) || 0,
      status: editingInvoice.status ?? 'emitida',
      issued_at: editingInvoice.issued_at || new Date().toISOString().split('T')[0],
      paid_at: editingInvoice.paid_at || null,
    }
    if (editingInvoice.id) {
      await supabase.from('invoices').update(payload).eq('id', editingInvoice.id)
    } else {
      await supabase.from('invoices').insert(payload)
    }
    setEditingInvoice(null)
    loadInvoices()
  }

  const deleteInvoice = async (id: string) => {
    if (!confirm('Apagar esta fatura?')) return
    await supabase.from('invoices').delete().eq('id', id)
    loadInvoices()
  }

  const isNew = !opportunity?.id

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{opportunity ? opportunity.title : 'Nova Oportunidade'}</h2>
            {opportunity && (
              <p className="text-xs text-slate-400 mt-0.5">{opportunity.client?.name ?? ''}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0 px-6 overflow-x-auto">
          {TABS.map(t => {
            const count = t === 'Propostas' ? proposals.length : t === 'Tarefas' ? tasks.length : t === 'Faturas' ? invoices.length : 0
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                disabled={isNew && t !== 'Detalhes'}
                className={`py-3 px-1 mr-5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors disabled:opacity-30 ${
                  tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t}
                {count > 0 && (
                  <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">

          {/* ── DETALHES ── */}
          {tab === 'Detalhes' && (
            <div className="space-y-4">
              <Input label="Título *" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Projeto Website Alpha" />
              <Select label="Cliente" value={clientId} onChange={e => setClientId(e.target.value)}
                options={[{ value: '', label: 'Sem cliente' }, ...clients.map(c => ({ value: c.id, label: c.name }))]} />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Etapa" value={stage} onChange={e => setStage(e.target.value as PipelineStage)} options={stageOptions} />
                <Input label="Valor (€)" type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="0" />
              </div>
              <Input label="Data prevista de fecho" type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Notas</label>
                <textarea rows={3}
                  className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas sobre esta oportunidade..." />
              </div>
            </div>
          )}

          {/* ── PROPOSTAS ── */}
          {tab === 'Propostas' && (
            <div className="space-y-3">
              {proposals.map(p => {
                const s = proposalStatusBadge[p.status]
                return (
                  <div key={p.id} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3.5">
                    <FileEdit size={16} className="text-slate-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-900 text-sm">{p.title}</p>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </div>
                      {p.valid_until && <p className="text-xs text-slate-400 mt-0.5">Válida até {formatDate(p.valid_until)}</p>}
                      {(p.content as Record<string,string>)?.services && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{(p.content as Record<string,string>).services}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditingProposal(p)} className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors"><ChevronRight size={14} /></button>
                      <button onClick={() => deleteProposal(p.id)} className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                )
              })}

              {editingProposal ? (
                <div className="border-2 border-blue-200 bg-blue-50/50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-blue-700">{editingProposal.id ? 'Editar proposta' : 'Nova proposta'}</p>
                  <Input label="Título *" value={editingProposal.title ?? ''} onChange={e => setEditingProposal(p => ({ ...p!, title: e.target.value }))} placeholder="Título da proposta" />
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Estado" value={editingProposal.status ?? 'rascunho'}
                      onChange={e => setEditingProposal(p => ({ ...p!, status: e.target.value as Proposal['status'] }))}
                      options={[
                        { value: 'rascunho', label: 'Rascunho' }, { value: 'enviada', label: 'Enviada' },
                        { value: 'negociacao', label: 'Negociação' }, { value: 'aceite', label: 'Aceite' }, { value: 'recusada', label: 'Recusada' },
                      ]} />
                    <Input label="Válida até" type="date" value={editingProposal.valid_until ?? ''}
                      onChange={e => setEditingProposal(p => ({ ...p!, valid_until: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Serviços / Solução</label>
                    <textarea rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={(editingProposal.content as Record<string,string>)?.services ?? ''}
                      onChange={e => setEditingProposal(p => ({ ...p!, content: { ...(p!.content as Record<string,string> ?? {}), services: e.target.value } }))}
                      placeholder="Descreve os serviços..." />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Condições Comerciais</label>
                    <textarea rows={2} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={(editingProposal.content as Record<string,string>)?.conditions ?? ''}
                      onChange={e => setEditingProposal(p => ({ ...p!, content: { ...(p!.content as Record<string,string> ?? {}), conditions: e.target.value } }))}
                      placeholder="Condições de pagamento, prazos..." />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveProposal} disabled={!editingProposal.title?.trim()}>Guardar</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingProposal(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditingProposal({ status: 'rascunho' })}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
                  <Plus size={15} /> Nova Proposta
                </button>
              )}
            </div>
          )}

          {/* ── TAREFAS ── */}
          {tab === 'Tarefas' && (
            <div className="space-y-2">
              {tasks.map(t => {
                const Icon = taskStatusIcon[t.status] ?? Circle
                const done = t.status === 'concluida'
                return (
                  <div key={t.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3.5 py-3">
                    <button onClick={() => toggleTask(t)} className={`shrink-0 transition-colors ${done ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-500'}`}>
                      <Icon size={18} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {t.due_date && <span className="text-xs text-slate-400">{formatDate(t.due_date)}</span>}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          t.priority === 'urgente' ? 'bg-red-100 text-red-600' :
                          t.priority === 'alta' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                        }`}>{t.priority}</span>
                      </div>
                    </div>
                    <button onClick={() => setEditingTask(t)} className="p-1.5 text-slate-300 hover:text-blue-500 shrink-0"><ChevronRight size={14} /></button>
                    <button onClick={() => deleteTask(t.id)} className="p-1.5 text-slate-300 hover:text-red-400 shrink-0"><Trash2 size={13} /></button>
                  </div>
                )
              })}

              {editingTask ? (
                <div className="border-2 border-blue-200 bg-blue-50/50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-blue-700">{editingTask.id ? 'Editar tarefa' : 'Nova tarefa'}</p>
                  <Input label="Título *" value={editingTask.title ?? ''} onChange={e => setEditingTask(p => ({ ...p!, title: e.target.value }))} placeholder="Título da tarefa" />
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Prioridade" value={editingTask.priority ?? 'normal'}
                      onChange={e => setEditingTask(p => ({ ...p!, priority: e.target.value as Task['priority'] }))}
                      options={[{ value: 'baixa', label: 'Baixa' }, { value: 'normal', label: 'Normal' }, { value: 'alta', label: 'Alta' }, { value: 'urgente', label: 'Urgente' }]} />
                    <Input label="Prazo" type="date" value={editingTask.due_date ?? ''} onChange={e => setEditingTask(p => ({ ...p!, due_date: e.target.value }))} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveTask} disabled={!editingTask.title?.trim()}>Guardar</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingTask(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditingTask({ priority: 'normal', status: 'por_fazer' })}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
                  <Plus size={15} /> Nova Tarefa
                </button>
              )}
            </div>
          )}

          {/* ── FATURAS ── */}
          {tab === 'Faturas' && (
            <div className="space-y-3">
              {invoices.map(inv => {
                const s = invoiceStatusBadge[inv.status]
                return (
                  <div key={inv.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3.5">
                    <FileText size={16} className="text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-900 text-sm">{inv.number}</p>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-sm font-semibold text-slate-700">{formatCurrency(inv.amount)}</p>
                        <p className="text-xs text-slate-400">{formatDate(inv.issued_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditingInvoice(inv)} className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors"><ChevronRight size={14} /></button>
                      <button onClick={() => deleteInvoice(inv.id)} className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                )
              })}

              {editingInvoice ? (
                <div className="border-2 border-blue-200 bg-blue-50/50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-blue-700">{editingInvoice.id ? 'Editar fatura' : 'Nova fatura'}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Nº Fatura *" value={editingInvoice.number ?? ''} onChange={e => setEditingInvoice(p => ({ ...p!, number: e.target.value }))} placeholder="FT 2025/001" />
                    <Input label="Valor (€)" type="number" value={String(editingInvoice.amount ?? '')} onChange={e => setEditingInvoice(p => ({ ...p!, amount: parseFloat(e.target.value) }))} placeholder="0" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Estado" value={editingInvoice.status ?? 'emitida'}
                      onChange={e => setEditingInvoice(p => ({ ...p!, status: e.target.value as Invoice['status'] }))}
                      options={[{ value: 'emitida', label: 'Emitida' }, { value: 'enviada', label: 'Enviada' }, { value: 'paga', label: 'Paga' }, { value: 'em_atraso', label: 'Em atraso' }]} />
                    <Input label="Data emissão" type="date" value={editingInvoice.issued_at ?? ''} onChange={e => setEditingInvoice(p => ({ ...p!, issued_at: e.target.value }))} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveInvoice} disabled={!editingInvoice.number?.trim()}>Guardar</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingInvoice(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditingInvoice({ status: 'emitida', issued_at: new Date().toISOString().split('T')[0] })}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
                  <Plus size={15} /> Nova Fatura
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          {tab === 'Detalhes' && (
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? 'A guardar...' : opportunity ? 'Guardar' : 'Criar Oportunidade'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
