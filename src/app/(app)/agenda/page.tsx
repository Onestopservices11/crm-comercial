'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarEvent, EventType } from '@/types'
import { Plus, Phone, Video, MapPin, Monitor, Calendar } from 'lucide-react'
import { EventModal } from '@/modules/agenda/event-modal'

const eventTypeIcon: Record<EventType, React.ElementType> = {
  reuniao: Calendar,
  chamada: Phone,
  visita: MapPin,
  demo: Monitor,
  outro: Calendar,
}

const eventTypeColor: Record<EventType, string> = {
  reuniao: 'bg-blue-100 text-blue-700',
  chamada: 'bg-green-100 text-green-700',
  visita: 'bg-orange-100 text-orange-700',
  demo: 'bg-purple-100 text-purple-700',
  outro: 'bg-gray-100 text-gray-700',
}

const eventTypeLabel: Record<EventType, string> = {
  reuniao: 'Reunião', chamada: 'Chamada', visita: 'Visita', demo: 'Demo', outro: 'Outro',
}

export default function AgendaPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming')
  const supabase = createClient()

  const load = async () => {
    const now = new Date().toISOString()
    const query = supabase
      .from('calendar_events')
      .select('*, owner:profiles(id,full_name), client:clients(id,name)')

    const { data } = view === 'upcoming'
      ? await query.gte('start_at', now).order('start_at', { ascending: true })
      : await query.lt('start_at', now).order('start_at', { ascending: false })

    setEvents(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [view])

  const groupByDay = (events: CalendarEvent[]) => {
    const groups: Record<string, CalendarEvent[]> = {}
    events.forEach((e) => {
      const day = new Date(e.start_at).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
      groups[day] = groups[day] ? [...groups[day], e] : [e]
    })
    return groups
  }

  const grouped = groupByDay(events)

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Os teus eventos e compromissos"
        action={
          <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={16} /> Novo Evento
          </Button>
        }
      />

      <div className="flex gap-2 mb-5">
        {(['upcoming', 'past'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              view === v ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {v === 'upcoming' ? 'Próximos' : 'Passados'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card><CardBody className="text-center py-10"><p className="text-gray-400">Sem eventos.</p></CardBody></Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, dayEvents]) => (
            <div key={day}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 capitalize">{day}</h3>
              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const Icon = eventTypeIcon[event.event_type]
                  return (
                    <Card key={event.id} onClick={() => { setEditing(event); setModalOpen(true) }}>
                      <CardBody className="flex items-center gap-4 py-3">
                        <div className={`rounded-lg p-2.5 shrink-0 ${eventTypeColor[event.event_type]}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{event.title}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-500">
                              {new Date(event.start_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                              {' – '}
                              {new Date(event.end_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {event.client && (
                              <span className="text-xs text-gray-400">{event.client.name}</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${eventTypeColor[event.event_type]}`}>
                          {eventTypeLabel[event.event_type]}
                        </span>
                      </CardBody>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <EventModal
          event={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load() }}
        />
      )}
    </div>
  )
}
