'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Invoice, Opportunity } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { X } from 'lucide-react'

interface InvoiceModalProps {
  invoice: Invoice | null
  onClose: () => void
  onSaved: () => void
}

export function InvoiceModal({ invoice, onClose, onSaved }: InvoiceModalProps) {
  const { user } = useAuth()
  const [number, setNumber] = useState(invoice?.number ?? '')
  const [amount, setAmount] = useState(String(invoice?.amount ?? ''))
  const [status, setStatus] = useState(invoice?.status ?? 'emitida')
  const [opportunityId, setOpportunityId] = useState(invoice?.opportunity_id ?? '')
  const [issuedAt, setIssuedAt] = useState(invoice?.issued_at ?? new Date().toISOString().slice(0, 10))
  const [opportunities, setOpportunities] = useState<Pick<Opportunity, 'id' | 'title'>[]>([])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('opportunities').select('id,title').eq('stage', 'fecho').then(({ data }) => setOpportunities(data ?? []))
  }, [])

  const handleSave = async () => {
    if (!number.trim()) return
    setSaving(true)

    const payload = {
      number,
      amount: parseFloat(amount) || 0,
      status,
      opportunity_id: opportunityId || null,
      issued_at: issuedAt,
      user_id: invoice?.user_id ?? user?.id,
    }

    if (invoice) {
      await supabase.from('invoices').update(payload).eq('id', invoice.id)
    } else {
      await supabase.from('invoices').insert(payload)
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{invoice ? 'Editar Fatura' : 'Nova Fatura'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Número" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="FT 2026/001" />
            <Input label="Valor (€)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <Select
            label="Oportunidade"
            value={opportunityId}
            onChange={(e) => setOpportunityId(e.target.value)}
            options={[{ value: '', label: 'Sem oportunidade' }, ...opportunities.map((o) => ({ value: o.id, label: o.title }))]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data de emissão" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
            <Select
              label="Estado"
              value={status}
              onChange={(e) => setStatus(e.target.value as Invoice['status'])}
              options={[
                { value: 'emitida', label: 'Emitida' },
                { value: 'enviada', label: 'Enviada' },
                { value: 'paga', label: 'Paga' },
                { value: 'em_atraso', label: 'Em Atraso' },
              ]}
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !number.trim()}>
            {saving ? 'A guardar...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
