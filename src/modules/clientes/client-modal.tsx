'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Client, Contact } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { X, Trash2, Plus, UserCircle, Star } from 'lucide-react'

interface ClientModalProps {
  client: Client | null
  onClose: () => void
  onSaved: () => void
}

const TABS = ['Entidade', 'Contactos'] as const
type Tab = typeof TABS[number]

export function ClientModal({ client, onClose, onSaved }: ClientModalProps) {
  const { user } = useAuth()
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('Entidade')
  const [name, setName]     = useState(client?.name ?? '')
  const [nif, setNif]       = useState(client?.nif ?? '')
  const [sector, setSector] = useState(client?.sector ?? '')
  const [status, setStatus] = useState(client?.status ?? 'lead')
  const [notes, setNotes]   = useState(client?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const [contacts, setContacts]         = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [editingContact, setEditingContact]   = useState<Partial<Contact> | null>(null)

  useEffect(() => {
    if (client?.id) loadContacts(client.id)
  }, [client?.id])

  const loadContacts = async (clientId: string) => {
    setLoadingContacts(true)
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('client_id', clientId)
      .order('is_primary', { ascending: false })
    setContacts((data ?? []) as Contact[])
    setLoadingContacts(false)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    const payload = {
      name: name.trim(),
      nif: nif.trim() || null,
      sector: sector.trim() || null,
      status,
      notes: notes.trim() || null,
      owner_id: client?.owner_id ?? user?.id,
    }
    if (client) {
      await supabase.from('clients').update(payload).eq('id', client.id)
    } else {
      await supabase.from('clients').insert(payload)
    }
    setSaving(false)
    onSaved()
  }

  const handleDelete = async () => {
    if (!client || !confirm('Apagar este cliente e todos os seus contactos?')) return
    await supabase.from('clients').delete().eq('id', client.id)
    onSaved()
  }

  const saveContact = async () => {
    if (!editingContact?.name?.trim()) return
    const clientId = client?.id
    if (!clientId) {
      alert('Guarda o cliente primeiro antes de adicionar contactos.')
      return
    }
    if (editingContact.id) {
      await supabase.from('contacts').update({
        name: editingContact.name,
        email: editingContact.email || null,
        phone: editingContact.phone || null,
        cargo: editingContact.cargo || null,
        is_primary: editingContact.is_primary ?? false,
        notes: editingContact.notes || null,
      }).eq('id', editingContact.id)
    } else {
      await supabase.from('contacts').insert({
        client_id: clientId,
        name: editingContact.name,
        email: editingContact.email || null,
        phone: editingContact.phone || null,
        cargo: editingContact.cargo || null,
        is_primary: editingContact.is_primary ?? false,
        notes: editingContact.notes || null,
      })
    }
    setEditingContact(null)
    loadContacts(clientId)
  }

  const deleteContact = async (id: string) => {
    if (!confirm('Apagar este contacto?')) return
    await supabase.from('contacts').delete().eq('id', id)
    if (client?.id) loadContacts(client.id)
  }

  const setPrimary = async (id: string) => {
    if (!client?.id) return
    await supabase.from('contacts').update({ is_primary: false }).eq('client_id', client.id)
    await supabase.from('contacts').update({ is_primary: true }).eq('id', id)
    loadContacts(client.id)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">{client ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0 px-6">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 px-1 mr-5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
              {t === 'Contactos' && contacts.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">
                  {contacts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">

          {tab === 'Entidade' && (
            <div className="space-y-4">
              <Input
                label="Nome da entidade *"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Empresa XYZ Lda. ou João Silva"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="NIF / NIPC"
                  value={nif}
                  onChange={e => setNif(e.target.value)}
                  placeholder="Ex: 509123456"
                />
                <Input
                  label="Setor"
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  placeholder="Ex: Tecnologia"
                />
              </div>
              <Select
                label="Estado"
                value={status}
                onChange={e => setStatus(e.target.value as Client['status'])}
                options={[
                  { value: 'lead',      label: 'Lead' },
                  { value: 'prospect',  label: 'Prospect' },
                  { value: 'ativo',     label: 'Cliente Ativo' },
                  { value: 'inativo',   label: 'Cliente Inativo' },
                  { value: 'arquivado', label: 'Arquivado' },
                ]}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Notas</label>
                <textarea
                  rows={3}
                  className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {tab === 'Contactos' && (
            <div className="space-y-3">
              {!client?.id && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  Guarda o cliente primeiro para poder adicionar contactos.
                </p>
              )}

              {loadingContacts ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : (
                <>
                  {contacts.map(c => (
                    <div key={c.id} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-blue-600">{c.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-slate-900 text-sm">{c.name}</p>
                          {c.is_primary && <Star size={11} className="text-amber-400 fill-amber-400" />}
                        </div>
                        {c.cargo && <p className="text-xs text-slate-500">{c.cargo}</p>}
                        {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                        {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!c.is_primary && (
                          <button onClick={() => setPrimary(c.id)} title="Tornar principal" className="p-1.5 text-slate-300 hover:text-amber-400 transition-colors">
                            <Star size={13} />
                          </button>
                        )}
                        <button onClick={() => setEditingContact(c)} className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors">
                          <UserCircle size={14} />
                        </button>
                        <button onClick={() => deleteContact(c.id)} className="p-1.5 text-slate-300 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {editingContact ? (
                    <div className="border-2 border-blue-200 bg-blue-50/50 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-semibold text-blue-700">{editingContact.id ? 'Editar contacto' : 'Novo contacto'}</p>
                      <Input
                        label="Nome *"
                        value={editingContact.name ?? ''}
                        onChange={e => setEditingContact(p => ({ ...p!, name: e.target.value }))}
                        placeholder="Nome completo"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Email"
                          type="email"
                          value={editingContact.email ?? ''}
                          onChange={e => setEditingContact(p => ({ ...p!, email: e.target.value }))}
                          placeholder="email@empresa.com"
                        />
                        <Input
                          label="Telefone"
                          value={editingContact.phone ?? ''}
                          onChange={e => setEditingContact(p => ({ ...p!, phone: e.target.value }))}
                          placeholder="+351 9xx xxx xxx"
                        />
                      </div>
                      <Input
                        label="Cargo"
                        value={editingContact.cargo ?? ''}
                        onChange={e => setEditingContact(p => ({ ...p!, cargo: e.target.value }))}
                        placeholder="Ex: Diretor Financeiro"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="primary"
                          checked={editingContact.is_primary ?? false}
                          onChange={e => setEditingContact(p => ({ ...p!, is_primary: e.target.checked }))}
                          className="rounded"
                        />
                        <label htmlFor="primary" className="text-sm text-slate-600">Contacto principal</label>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveContact} disabled={!editingContact.name?.trim()}>Guardar</Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingContact(null)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    client?.id && (
                      <button
                        onClick={() => setEditingContact({ is_primary: contacts.length === 0 })}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
                      >
                        <Plus size={15} /> Adicionar contacto
                      </button>
                    )
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-between px-6 py-4 border-t shrink-0">
          {client && (
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 size={14} /> Apagar
            </Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
            {tab === 'Entidade' && (
              <Button onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? 'A guardar...' : 'Guardar'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
