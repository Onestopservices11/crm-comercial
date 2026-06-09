'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { CalendarEvent, Client } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { X, Trash2 } from 'lucide-react'

interface EventModalProps {
  event: CalendarEvent | null
  onClose: () => void
  onSaved: () => void
}

export function EventModal({ event, onClose, onSaved }: EventModalProps) {
  const { user } = useAuth()
  const now = new Date()
  const defaultStart = now.toISOString().slice(0, 16)
  const defaultEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16)

  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [type, setType] = useState(event?.event_type ?? 'reuniao')
  const [startAt, setStartAt] = useState(event?.start_at ? event.start_at.slice(0, 16) : defaultStart)
  const [endAt, setEndAt] = useState(event?.end_at ? event.end_at.slice(0, 16) : defaultEnd)
  const [clientId, setClientId] = useState(event?.client_id ?? '')
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
      description: description || null,
      event_type: type,
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt).toISOString(),
      client_id: clientId || null,
      owner_id: event?.owner_id ?? user?.id,
    }

    if (event) {
      await supabase.from('calendar_events').update(payload).eq('id', event.id)
    } else {
      await supabase.from('calendar_events').insert(payload)
    }

    setSaving(false)
    onSaved()
  }

  const handleDelete = async () => {
    if (!event || !confirm('Apagar este evento?')) return
    await supabase.from('calendar_events').delete().eq('id', event.id)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{event ? 'Editar Evento' : 'Novo Evento'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Reunião com cliente Alpha" />
          <Select
            label="Tipo"
            value={type}
            onChange={(e) => setType(e.target.value as CalendarEvent['event_type'])}
            options={[
              { value: 'reuniao', label: 'Reunião' },
              { value: 'chamada', label: 'Chamada' },
              { value: 'visita', label: 'Visita' },
              { value: 'demo', label: 'Demo' },
              { value: 'outro', label: 'Outro' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Início" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            <Input label="Fim" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </div>
          <Select
            label="Cliente (opcional)"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            options={[{ value: '', label: 'Sem cliente' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              rows={2}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-3 justify-between px-6 py-4 border-t">
          {event && (
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 size={14} /> Apagar
            </Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
