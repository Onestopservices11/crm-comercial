'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MetricDefinition, UserProfile } from '@/types'
import { X, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { currentMonthRange } from '@/lib/metrics-engine'

interface Props {
  metric: MetricDefinition
  onClose: () => void
  onSaved: () => void
}

interface Row { userId: string; target: string }

export function AssignModal({ metric, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [comerciais, setComerciais] = useState<UserProfile[]>([])
  const [rows, setRows] = useState<Row[]>([{ userId: '', target: String(metric.default_target) }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'comercial').then(({ data }) => {
      setComerciais((data ?? []) as UserProfile[])
    })
  }, [])

  const addRow = () => setRows(p => [...p, { userId: '', target: String(metric.default_target) }])
  const removeRow = (i: number) => setRows(p => p.filter((_, idx) => idx !== i))
  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows(p => p.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  const save = async () => {
    const valid = rows.filter(r => r.userId && Number(r.target) > 0)
    if (!valid.length) return
    setSaving(true)
    const { start, end } = currentMonthRange()
    await supabase.from('metric_assignments').upsert(
      valid.map(r => ({
        metric_id: metric.id,
        assigned_to: r.userId,
        target: Number(r.target),
        period_start: start,
        period_end: end,
      })),
      { onConflict: 'metric_id,assigned_to,period_start' }
    )
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">Distribuir — {metric.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Atribui targets para este mês</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-3">
          <div className="grid grid-cols-[1fr_100px_32px] gap-2 text-xs font-semibold text-slate-500 px-1">
            <span>Comercial</span><span className="text-center">Target</span><span />
          </div>

          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_100px_32px] gap-2 items-center">
              <select
                value={row.userId}
                onChange={e => updateRow(i, { userId: e.target.value })}
                className="text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecionar...</option>
                {comerciais.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                value={row.target}
                onChange={e => updateRow(i, { target: e.target.value })}
                className="text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                className="p-1.5 text-slate-300 hover:text-red-400 disabled:opacity-0 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mt-1"
          >
            <Plus size={14} /> Adicionar comercial
          </button>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'A guardar...' : 'Guardar Targets'}
          </Button>
        </div>
      </div>
    </div>
  )
}
