'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Rule } from '@/types'
import { X, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  RuleEntityType, RuleCondition, RuleDefinition,
  ENTITY_FIELDS, FIELD_OPTIONS, OPERATORS_FOR_TYPE,
} from '@/lib/rules-engine'

const ENTITY_LABELS: Record<RuleEntityType, string> = {
  opportunity: 'Oportunidade',
  task: 'Tarefa',
  client: 'Cliente',
}

const SEVERITY_OPTIONS = [
  { value: 'info', label: 'Info', color: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'warning', label: 'Atenção', color: 'border-amber-400 bg-amber-50 text-amber-700' },
  { value: 'danger', label: 'Urgente', color: 'border-red-400 bg-red-50 text-red-700' },
]

interface Props {
  rule: Rule | null
  onClose: () => void
  onSaved: () => void
}

const defaultDef = (entity: RuleEntityType): RuleDefinition => ({
  entity_type: entity,
  conditions: [{ field: ENTITY_FIELDS[entity][0].key, operator: 'greater_than', value: '7' }],
  action: { type: 'create_alert', severity: 'warning', message_template: '{name} requer atenção.' },
})

export function RuleModal({ rule, onClose, onSaved }: Props) {
  const supabase = createClient()
  const existingDef = rule?.definition as RuleDefinition | undefined

  const [name, setName] = useState(rule?.name ?? '')
  const [entity, setEntity] = useState<RuleEntityType>(existingDef?.entity_type ?? 'opportunity')
  const [conditions, setConditions] = useState<RuleCondition[]>(
    existingDef?.conditions ?? defaultDef('opportunity').conditions
  )
  const [severity, setSeverity] = useState(existingDef?.action?.severity ?? 'warning')
  const [messageTemplate, setMessageTemplate] = useState(
    existingDef?.action?.message_template ?? '{name} requer atenção.'
  )
  const [saving, setSaving] = useState(false)

  const fields = ENTITY_FIELDS[entity]

  const changeEntity = (e: RuleEntityType) => {
    setEntity(e)
    const d = defaultDef(e)
    setConditions(d.conditions)
  }

  const addCondition = () => {
    setConditions(prev => [...prev, { field: fields[0].key, operator: 'greater_than', value: '' }])
  }

  const removeCondition = (i: number) => {
    setConditions(prev => prev.filter((_, idx) => idx !== i))
  }

  const updateCondition = (i: number, patch: Partial<RuleCondition>) => {
    setConditions(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  }

  const getFieldType = (fieldKey: string) =>
    fields.find(f => f.key === fieldKey)?.type ?? 'text'

  const getOperators = (fieldKey: string) =>
    OPERATORS_FOR_TYPE[getFieldType(fieldKey)] ?? OPERATORS_FOR_TYPE.text

  const getSelectOptions = (fieldKey: string) =>
    FIELD_OPTIONS[`${entity}.${fieldKey}`] ?? []

  const save = async () => {
    if (!name.trim() || conditions.length === 0) return
    setSaving(true)
    const definition: RuleDefinition = {
      entity_type: entity,
      conditions,
      action: { type: 'create_alert', severity: severity as RuleDefinition['action']['severity'], message_template: messageTemplate },
    }
    const payload = {
      name: name.trim(),
      definition,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-semibold text-slate-900">{rule ? 'Editar Regra' : 'Nova Regra'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome da regra</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Propostas sem resposta há 5 dias" />
          </div>

          {/* Entidade */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Aplicar a</label>
            <div className="flex gap-2">
              {(Object.keys(ENTITY_LABELS) as RuleEntityType[]).map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => changeEntity(e)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    entity === e
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {ENTITY_LABELS[e]}
                </button>
              ))}
            </div>
          </div>

          {/* Condições */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">Condições <span className="text-slate-400 font-normal">(todas têm de ser verdade)</span></label>
              <button
                type="button"
                onClick={addCondition}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus size={13} /> Adicionar
              </button>
            </div>

            <div className="space-y-2">
              {conditions.map((cond, i) => {
                const fieldType = getFieldType(cond.field)
                const operators = getOperators(cond.field)
                const selectOpts = getSelectOptions(cond.field)

                return (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                    {/* Campo */}
                    <select
                      value={cond.field}
                      onChange={e => updateCondition(i, { field: e.target.value, operator: getOperators(e.target.value)[0].value, value: '' })}
                      className="flex-1 text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>

                    {/* Operador */}
                    <select
                      value={cond.operator}
                      onChange={e => updateCondition(i, { operator: e.target.value as RuleCondition['operator'] })}
                      className="flex-1 text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                    </select>

                    {/* Valor */}
                    {fieldType === 'select' ? (
                      <select
                        value={cond.value}
                        onChange={e => updateCondition(i, { value: e.target.value })}
                        className="flex-1 text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecionar...</option>
                        {selectOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={cond.value}
                        onChange={e => updateCondition(i, { value: e.target.value })}
                        placeholder="Valor"
                        className="w-20 text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}

                    {conditions.length > 1 && (
                      <button type="button" onClick={() => removeCondition(i)} className="text-slate-300 hover:text-red-400 shrink-0">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Ação */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Ação — Criar alerta</label>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Severidade</p>
                <div className="flex gap-2">
                  {SEVERITY_OPTIONS.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSeverity(s.value as 'info' | 'warning' | 'danger')}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                        severity === s.value ? s.color : 'border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Mensagem do alerta</p>
                <input
                  value={messageTemplate}
                  onChange={e => setMessageTemplate(e.target.value)}
                  placeholder='Ex: "{name}" está parada há demasiado tempo.'
                  className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">Usa <code className="bg-slate-100 px-1 rounded">{'{name}'}</code> para o nome do registo.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !name.trim() || conditions.length === 0}>
            {saving ? 'A guardar...' : 'Guardar Regra'}
          </Button>
        </div>
      </div>
    </div>
  )
}
