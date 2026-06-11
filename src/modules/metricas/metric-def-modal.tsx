'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MetricDefinition } from '@/types'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { METRIC_TYPE_LABELS } from '@/lib/metrics-engine'

interface Props {
  metric: MetricDefinition | null
  onClose: () => void
  onSaved: () => void
}

export function MetricDefModal({ metric, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [name, setName]               = useState(metric?.name ?? '')
  const [description, setDescription] = useState(metric?.description ?? '')
  const [metricType, setMetricType]   = useState(metric?.metric_type ?? 'reunioes_este_mes')
  const [target, setTarget]           = useState(String(metric?.default_target ?? 10))
  const [unit, setUnit]               = useState(metric?.unit ?? '')
  const [saving, setSaving]           = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      metric_type: metricType,
      default_target: Number(target),
      unit: unit.trim(),
      period: 'monthly',
    }
    if (metric) {
      await supabase.from('metric_definitions').update(payload).eq('id', metric.id)
    } else {
      await supabase.from('metric_definitions').insert({ ...payload, is_active: true })
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-semibold text-slate-900">{metric ? 'Editar Métrica' : 'Nova Métrica'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Reuniões mensais" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição (opcional)</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição breve..." />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Tipo de métrica</label>
            <div className="space-y-1.5">
              {Object.entries(METRIC_TYPE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMetricType(key)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border-2 text-sm transition-all ${
                    metricType === key
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Target padrão</label>
              <Input type="number" min="0" value={target} onChange={e => setTarget(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unidade</label>
              <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="ex: reuniões, €" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'A guardar...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
