'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Client } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { X, Trash2 } from 'lucide-react'

interface ClientModalProps {
  client: Client | null
  onClose: () => void
  onSaved: () => void
}

export function ClientModal({ client, onClose, onSaved }: ClientModalProps) {
  const { user } = useAuth()
  const [name, setName] = useState(client?.name ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [company, setCompany] = useState(client?.company ?? '')
  const [sector, setSector] = useState(client?.sector ?? '')
  const [status, setStatus] = useState(client?.status ?? 'lead')
  const [notes, setNotes] = useState(client?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)

    const payload = {
      name,
      email: email || null,
      phone: phone || null,
      company: company || null,
      sector: sector || null,
      status,
      notes: notes || null,
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
    if (!client || !confirm('Apagar este cliente?')) return
    await supabase.from('clients').delete().eq('id', client.id)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">{client ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Input label="Nome *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" />
            <Input label="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+351 9xx xxx xxx" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Empresa" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nome da empresa" />
            <Input label="Setor" value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Ex: Tecnologia" />
          </div>
          <Select
            label="Estado"
            value={status}
            onChange={(e) => setStatus(e.target.value as Client['status'])}
            options={[
              { value: 'lead', label: 'Lead' },
              { value: 'prospect', label: 'Prospect' },
              { value: 'ativo', label: 'Cliente Ativo' },
              { value: 'inativo', label: 'Cliente Inativo' },
              { value: 'arquivado', label: 'Arquivado' },
            ]}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              rows={3}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-3 justify-between px-6 py-4 border-t sticky bottom-0 bg-white">
          {client && (
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 size={14} /> Apagar
            </Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
