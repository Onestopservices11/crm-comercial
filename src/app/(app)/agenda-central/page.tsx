'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { CalendarEvent, UserProfile } from '@/types'
import { Avatar } from '@/components/ui/avatar'

export default function AgendaCentralPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filterUser, setFilterUser] = useState<string>('todos')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const [{ data: evts }, { data: usrs }] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('*, owner:profiles(id,full_name,avatar_url), client:clients(id,name)')
          .gte('start_at', new Date().toISOString())
          .order('start_at', { ascending: true }),
        supabase.from('profiles').select('*').order('full_name'),
      ])
      setEvents(evts ?? [])
      setUsers(usrs ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filterUser === 'todos' ? events : events.filter((e) => e.owner_id === filterUser)

  const groupByDay = (evts: CalendarEvent[]) => {
    const groups: Record<string, CalendarEvent[]> = {}
    evts.forEach((e) => {
      const day = new Date(e.start_at).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
      groups[day] = groups[day] ? [...groups[day], e] : [e]
    })
    return groups
  }

  return (
    <div>
      <PageHeader title="Agenda Central" description="Vista unificada de todos os eventos da equipa" />

      <div className="flex gap-2 flex-wrap mb-5">
        <button
          onClick={() => setFilterUser('todos')}
          className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${filterUser === 'todos' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Todos
        </button>
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => setFilterUser(u.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${filterUser === u.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Avatar name={u.full_name} size="sm" className="h-5 w-5 text-[10px]" />
            {u.full_name.split(' ')[0]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupByDay(filtered)).map(([day, dayEvents]) => (
            <div key={day}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 capitalize">{day}</h3>
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <Card key={event.id}>
                    <CardBody className="flex items-center gap-4 py-3">
                      <div className="text-center min-w-[48px]">
                        <p className="text-xs font-bold text-gray-700">
                          {new Date(event.start_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(event.end_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{event.title}</p>
                        {event.client && <p className="text-xs text-gray-500">{event.client.name}</p>}
                      </div>
                      {event.owner && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Avatar name={event.owner.full_name} size="sm" />
                          <span className="text-xs text-gray-500">{event.owner.full_name.split(' ')[0]}</span>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(groupByDay(filtered)).length === 0 && (
            <Card><CardBody className="text-center py-10"><p className="text-gray-400">Sem eventos próximos.</p></CardBody></Card>
          )}
        </div>
      )}
    </div>
  )
}
