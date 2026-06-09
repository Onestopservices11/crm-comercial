'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/layout/page-header'
import { ShieldCheck, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MODULES = [
  { key: 'dashboard',      label: 'Dashboard',       group: 'Geral' },
  { key: 'chat',           label: 'Chat',             group: 'Geral' },
  { key: 'clientes',       label: 'Clientes',         group: 'Fluxo Comercial' },
  { key: 'pipeline',       label: 'Pipeline',         group: 'Fluxo Comercial' },
  { key: 'propostas',      label: 'Propostas',        group: 'Fluxo Comercial' },
  { key: 'faturacao',      label: 'Faturação',        group: 'Fluxo Comercial' },
  { key: 'comissoes',      label: 'Comissões',        group: 'Fluxo Comercial' },
  { key: 'tarefas',        label: 'Tarefas',          group: 'Dia-a-Dia' },
  { key: 'agenda',         label: 'Agenda',           group: 'Dia-a-Dia' },
  { key: 'agenda_central', label: 'Agenda Central',   group: 'Dia-a-Dia' },
  { key: 'procedimentos',  label: 'Procedimentos',    group: 'Dia-a-Dia' },
  { key: 'equipas',        label: 'Equipas',          group: 'Equipa' },
  { key: 'utilizadores',   label: 'Utilizadores',     group: 'Equipa' },
]

const ROLES = [
  { key: 'diretor_comercial', label: 'Diretor Comercial', color: 'text-blue-700 bg-blue-50' },
  { key: 'comercial',         label: 'Comercial',         color: 'text-green-700 bg-green-50' },
]

type PermMap = Record<string, Record<string, boolean>>

const groups = [...new Set(MODULES.map(m => m.group))]

export default function PermissoesPage() {
  const [perms, setPerms] = useState<PermMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('role_permissions')
      .select('role, module, allowed')
      .in('role', ['diretor_comercial', 'comercial'])
      .then(({ data }) => {
        const map: PermMap = {}
        for (const row of data ?? []) {
          if (!map[row.role]) map[row.role] = {}
          map[row.role][row.module] = row.allowed
        }
        setPerms(map)
        setLoading(false)
      })
  }, [])

  const toggle = (role: string, module: string) => {
    setPerms(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [module]: !prev[role]?.[module],
      },
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const rows = ROLES.flatMap(r =>
      MODULES.map(m => ({
        role: r.key,
        module: m.key,
        allowed: perms[r.key]?.[m.key] ?? false,
      }))
    )

    const { error } = await supabase
      .from('role_permissions')
      .upsert(rows, { onConflict: 'role,module' })

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Permissões"
        description="Define o que cada perfil pode aceder. O Admin tem sempre acesso total."
        action={
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} />
            {saving ? 'A guardar...' : saved ? '✓ Guardado' : 'Guardar Alterações'}
          </Button>
        }
      />

      {/* Nota Admin */}
      <div className="mb-6 flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-xl p-4">
        <ShieldCheck size={18} className="text-purple-600 shrink-0 mt-0.5" />
        <p className="text-sm text-purple-700">
          O perfil <strong>Admin</strong> tem acesso completo a todos os módulos e não pode ser restringido.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="grid border-b border-gray-200 bg-gray-50" style={{ gridTemplateColumns: '1fr repeat(2, 160px)' }}>
          <div className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Módulo</div>
          {ROLES.map(r => (
            <div key={r.key} className="px-4 py-3 text-center">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${r.color}`}>{r.label}</span>
            </div>
          ))}
        </div>

        {/* Rows por grupo */}
        {groups.map(group => (
          <div key={group}>
            <div className="px-6 py-2 bg-gray-50 border-y border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{group}</p>
            </div>
            {MODULES.filter(m => m.group === group).map((mod, i, arr) => (
              <div
                key={mod.key}
                className={`grid items-center ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}
                style={{ gridTemplateColumns: '1fr repeat(2, 160px)' }}
              >
                <div className="px-6 py-3.5 text-sm font-medium text-gray-800">{mod.label}</div>
                {ROLES.map(r => {
                  const allowed = perms[r.key]?.[mod.key] ?? false
                  return (
                    <div key={r.key} className="flex justify-center py-3.5">
                      <button
                        onClick={() => toggle(r.key, mod.key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          allowed ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            allowed ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
