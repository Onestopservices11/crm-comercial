'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Opportunity, Client, PipelineStage } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { X } from 'lucide-react'

interface OpportunityModalProps {
  opportunity: Opportunity | null
  onClose: () => void
  onSaved: () => void
}

const stageOptions = [
  { value: 'lead', label: 'Lead' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'fecho', label: 'Fecho' },
  { value: 'perdido', label: 'Perdido' },
]

export function OpportunityModal({ opportunity, onClose, onSaved }: OpportunityModalProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState(opportunity?.title ?? '')
  const [clientId, setClientId] = useState(opportunity?.client_id ?? '')
  const [stage, setStage] = useState<PipelineStage>(opportunity?.stage ?? 'lead')
  const [value, setValue] = useState(String(opportunity?.value ?? ''))
  const [closeDate, setCloseDate] = useState(opportunity?.expected_close_date ?? '')
  const [notes, setNotes] = useState(opportunity?.notes ?? '')
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
      stage,
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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{opportunity ? 'Editar Oportunidade' : 'Nova Oportunidade'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Projeto Website Alpha" />
          <Select
            label="Cliente"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            options={[{ value: '', label: 'Sem cliente' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Etapa" value={stage} onChange={(e) => setStage(e.target.value as PipelineStage)} options={stageOptions} />
            <Input label="Valor (€)" type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
          </div>
          <Input label="Data prevista de fecho" type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              rows={3}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas sobre esta oportunidade..."
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'A guardar...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
