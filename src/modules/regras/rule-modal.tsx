'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Rule, RuleTriggerType, RuleSeverity } from '@/types'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const TRIGGER_OPTIONS: { value: RuleTriggerType; label: string; description: string }[] = [
  { value: 'oportunidade_parada', label: 'Oportunidade parada', description: 'Alerta quando uma oportunidade não é atualizada há X dias' },
  { value: 'prazo_fecho_proximo', label: 'Prazo de fecho próximo', description: 'Alerta quando o fecho esperado está em menos de X dias' },
  { value: 'tarefa_atrasada', label: 'Tarefa atrasada', description: 'Alerta quando uma tarefa ultrapassa o prazo' },
  { value: 'valor_alto', label: 'Oportunidade de valor alto', description: 'Alerta quando uma oportunidade ativa tem valor acima de X€' },
]

interface Props {
  rule: Rule | null
  onClose: () => void
  onSaved: () => void
}

export function RuleModal({ rule, onClose, onSaved }: Props) {
  const supabase = createClient()
  const cfg = (rule?.trigger_config ?? {}) as Record<string, unknown>

  const [name, setName] = useState(rule?.name ?? '')
  const [description, setDescription] = useState(rule?.description ?? '')
  const [triggerType, setTriggerType] = useState<RuleTriggerType>(rule?.trigger_type ?? 'oportunidade_parada')
  const [severity, setSeverity] = useState<RuleSeverity>(rule?.severity ?? 'warning')
  const [dias, setDias] = useState(String(cfg.dias ?? 7))
  const [valor, setValor] = useState(String(cfg.valor ?? 10000))
  const [saving, setSaving] = useState(false)

  const buildConfig = (): Record<string, unknown> => {
    if (triggerType === 'oportunidade_parada') return { dias: Number(dias) }
    if (triggerType === 'prazo_fecho_proximo') return { dias: Number(dias) }
    if (triggerType === 'valor_alto') return { valor: Number(valor) }
    return {}
  }

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      trigger_type: triggerType,
      trigger_config: buildConfig(),
      action_type: 'criar_alerta',
      action_config: {},
      severity,
      updated_at: new Date().toISOString(),
    }
    if (rule) {
      await supabase.from('rules').update(payload).eq('id', rule.id)
    } else {
      await supabase.from('rules').insert({ ...payload, is_active: true })
    }
    setSaving(false)
    onSaved()
  }

  const selectedTrigger = TRIGGER_OPTIONS.find(t => t.value === triggerType)!

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-semibold text-slate-900">{rule ? 'Editar Regra' : 'Nova Regra'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nome da regra</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Oportunidades paradas 7 dias" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Descrição (opcional)</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição breve..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Tipo de gatilho</label>
            <div className="space-y-2">
              {TRIGGER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTriggerType(opt.value)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl border-2 transition-all ${
                    triggerType === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className={`text-sm font-medium ${triggerType === opt.value ? 'text-blue-700' : 'text-slate-800'}`}>{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic config */}
          {(triggerType === 'oportunidade_parada' || triggerType === 'prazo_fecho_proximo') && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {triggerType === 'oportunidade_parada' ? 'Dias sem atualização' : 'Dias até ao fecho'}
              </label>
              <Input type="number" min="1" value={dias} onChange={e => setDias(e.target.value)} />
            </div>
          )}

          {triggerType === 'valor_alto' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Valor mínimo (€)</label>
              <Input type="number" min="0" value={valor} onChange={e => setValor(e.target.value)} />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Severidade do alerta</label>
            <div className="flex gap-2">
              {(['info', 'warning', 'danger'] as RuleSeverity[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all capitalize ${
                    severity === s
                      ? s === 'info' ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : s === 'warning' ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {s === 'info' ? 'Info' : s === 'warning' ? 'Atenção' : 'Urgente'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !name.trim()}>
            {saving ? 'A guardar...' : 'Guardar Regra'}
          </Button>
        </div>
      </div>
    </div>
  )
}
