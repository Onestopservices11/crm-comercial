'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Proposal, Client } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { X } from 'lucide-react'

interface ProposalModalProps {
  proposal: Proposal | null
  onClose: () => void
  onSaved: () => void
}

export function ProposalModal({ proposal, onClose, onSaved }: ProposalModalProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState(proposal?.title ?? '')
  const [clientId, setClientId] = useState(proposal?.client_id ?? '')
  const [status, setStatus] = useState(proposal?.status ?? 'rascunho')
  const [validUntil, setValidUntil] = useState(proposal?.valid_until ?? '')
  const [services, setServices] = useState((proposal?.content as { services?: string })?.services ?? '')
  const [conditions, setConditions] = useState((proposal?.content as { conditions?: string })?.conditions ?? '')
  const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('clients').select('id,name').order('name').then(({ data }) => setClients(data ?? []))
  }, [])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)

    const payload = {
      title,
      client_id: clientId || null,
      status,
      valid_until: validUntil || null,
      content: { services, conditions },
      owner_id: proposal?.owner_id ?? user?.id,
      version: proposal ? proposal.version : 1,
    }

    if (proposal) {
      await supabase.from('proposals').update({ ...payload, version: proposal.version + 1 }).eq('id', proposal.id)
    } else {
      await supabase.from('proposals').insert(payload)
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">{proposal ? 'Editar Proposta' : 'Nova Proposta'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Proposta Desenvolvimento Web" />
          <Select
            label="Cliente"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            options={[{ value: '', label: 'Sem cliente' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Estado"
              value={status}
              onChange={(e) => setStatus(e.target.value as Proposal['status'])}
              options={[
                { value: 'rascunho', label: 'Rascunho' },
                { value: 'enviada', label: 'Enviada' },
                { value: 'negociacao', label: 'Negociação' },
                { value: 'aceite', label: 'Aceite' },
                { value: 'recusada', label: 'Recusada' },
              ]}
            />
            <Input label="Válida até" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Serviços / Solução</label>
            <textarea
              rows={4}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={services}
              onChange={(e) => setServices(e.target.value)}
              placeholder="Descreve os serviços propostos..."
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Condições Comerciais</label>
            <textarea
              rows={3}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="Condições de pagamento, prazos, etc..."
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end px-6 py-4 border-t sticky bottom-0 bg-white">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'A guardar...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
