'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell, X, CheckCheck, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Alert, RuleSeverity } from '@/types'
import { cn } from '@/lib/utils'

const severityIcon: Record<RuleSeverity, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  danger: AlertCircle,
}

const severityColor: Record<RuleSeverity, string> = {
  info: 'text-blue-500 bg-blue-50',
  warning: 'text-amber-500 bg-amber-50',
  danger: 'text-red-500 bg-red-50',
}

export function AlertsBell() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(30)
    setAlerts((data ?? []) as Alert[])
  }

  useEffect(() => {
    load()
    // Poll every 2 minutes
    const interval = setInterval(load, 120000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const markRead = async (id: string) => {
    await supabase.from('alerts').update({ is_read: true }).eq('id', id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const markAllRead = async () => {
    const ids = alerts.map(a => a.id)
    if (ids.length === 0) return
    await supabase.from('alerts').update({ is_read: true }).in('id', ids)
    setAlerts([])
  }

  const unread = alerts.length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        title="Alertas"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-900">Alertas</p>
              <p className="text-xs text-slate-400">{unread} não lido{unread !== 1 ? 's' : ''}</p>
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <CheckCheck size={13} /> Marcar todos
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <Bell size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Sem alertas</p>
              </div>
            ) : (
              alerts.map(alert => {
                const Icon = severityIcon[alert.severity]
                return (
                  <div key={alert.id} className="flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', severityColor[alert.severity])}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {alert.rule_name && (
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{alert.rule_name}</p>
                      )}
                      <p className="text-xs text-slate-700 leading-snug">{alert.message}</p>
                    </div>
                    <button
                      onClick={() => markRead(alert.id)}
                      className="text-slate-300 hover:text-slate-500 shrink-0 mt-0.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
