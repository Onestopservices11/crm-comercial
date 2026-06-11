'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Rule, RuleSeverity } from '@/types'
import { Plus, Zap, AlertTriangle, Info, AlertCircle, Pencil, Trash2, ToggleLeft, ToggleRight, Play } from 'lucide-react'
import { RuleModal } from '@/modules/regras/rule-modal'
import { evaluateRules, RuleDefinition, ENTITY_FIELDS } from '@/lib/rules-engine'

const severityStyle: Record<RuleSeverity, { label: string; color: string; icon: React.ElementType }> = {
  info: { label: 'Info', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Info },
  warning: { label: 'Atenção', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: AlertTriangle },
  danger: { label: 'Urgente', color: 'text-red-600 bg-red-50 border-red-200', icon: AlertCircle },
}

const entityLabel: Record<string, string> = {
  opportunity: 'Oportunidade',
  task: 'Tarefa',
  client: 'Cliente',
}

function conditionSummary(def: RuleDefinition): string {
  if (!def?.conditions?.length) return ''
  return def.conditions.map(c => {
    const fieldMeta = ENTITY_FIELDS[def.entity_type]?.find(f => f.key === c.field)
    const fieldLabel = fieldMeta?.label ?? c.field
    const opLabel: Record<string, string> = {
      equals: '=', not_equals: '≠', greater_than: '>', less_than: '<',
      older_than_days: 'há mais de', within_days: 'em menos de', contains: 'contém',
    }
    return `${fieldLabel} ${opLabel[c.operator] ?? c.operator} ${c.value}`
  }).join(' · ')
}

export default function RegrasPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Rule | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard')
  }, [user, router])

  const load = async () => {
    const { data } = await supabase.from('rules').select('*').order('created_at', { ascending: false })
    setRules((data ?? []) as Rule[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleActive = async (rule: Rule) => {
    await supabase.from('rules').update({ is_active: !rule.is_active }).eq('id', rule.id)
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Apagar esta regra?')) return
    await supabase.from('rules').delete().eq('id', id)
    setRules(prev => prev.filter(r => r.id !== id))
  }

  const runTest = async () => {
    if (!user) return
    setTesting(true)
    setTestResult(null)
    try {
      const alerts = await evaluateRules(user.id)
      setTestResult(alerts.length > 0
        ? `✓ ${alerts.length} alerta(s) criado(s)`
        : '✓ Sem novos alertas — nenhum registo viola as condições activas no momento'
      )
    } catch (e: unknown) {
      setTestResult(`Erro: ${e instanceof Error ? e.message : String(e)}`)
    }
    setTesting(false)
  }

  if (!user || user.role !== 'admin') return null

  return (
    <div>
      <PageHeader
        title="Regras e Alertas"
        description="Define regras personalizadas que geram alertas automáticos para a equipa"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={runTest} disabled={testing}>
              <Play size={15} /> {testing ? 'A testar...' : 'Testar agora'}
            </Button>
            <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
              <Plus size={16} /> Nova Regra
            </Button>
          </div>
        }
      />

      {testResult && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${
          testResult.startsWith('Erro')
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {testResult}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardBody className="text-center py-14">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Zap size={26} className="text-blue-500" />
            </div>
            <p className="font-semibold text-slate-800 mb-1">Sem regras definidas</p>
            <p className="text-slate-400 text-sm mb-4">
              Cria regras com as tuas próprias condições para receber alertas automáticos.
            </p>
            <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
              <Plus size={15} /> Criar primeira regra
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const sev = severityStyle[rule.severity]
            const SevIcon = sev.icon
            const def = rule.definition as unknown as RuleDefinition
            return (
              <Card key={rule.id} className={rule.is_active ? '' : 'opacity-50'}>
                <CardBody className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${sev.color}`}>
                    <SevIcon size={17} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{rule.name}</p>
                      {def?.entity_type && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          {entityLabel[def.entity_type]}
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sev.color}`}>
                        {sev.label}
                      </span>
                      {!rule.is_active && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
                          Inativa
                        </span>
                      )}
                    </div>
                    {def?.conditions?.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        SE {conditionSummary(def)}
                      </p>
                    )}
                    {def?.action?.message_template && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        → {def.action.message_template}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleActive(rule)}
                      title={rule.is_active ? 'Desativar' : 'Ativar'}
                      className={`p-2 rounded-lg transition-colors ${rule.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                      {rule.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button
                      onClick={() => { setEditing(rule); setModalOpen(true) }}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <RuleModal
          rule={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load() }}
        />
      )}
    </div>
  )
}
