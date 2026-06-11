'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { UserProfile, UserRole } from '@/types'
import { roleLabel, roleColor } from '@/lib/utils'
import { Plus, Pencil, Ban, CheckCircle2, Search } from 'lucide-react'
import { UserModal } from '@/modules/utilizadores/user-modal'
import { createClient } from '@/lib/supabase/client'

export default function UtilizadoresPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UserProfile | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [diagResult, setDiagResult] = useState<Record<string, unknown> | null>(null)
  const [diagName, setDiagName] = useState('')
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name')
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const adminAction = async (userId: string, action: string) => {
    setActionLoading(userId + action)
    await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action }),
    })
    setActionLoading(null)
    load()
  }

  const diagnose = async (u: UserProfile) => {
    setDiagResult(null)
    setDiagName(u.full_name)
    const res = await fetch('/api/admin/diagnose-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u.id }),
    })
    const json = await res.json()
    setDiagResult(json)
  }

  const byRole = (role: UserRole) => users.filter(u => u.role === role)

  const groups: { role: UserRole; label: string; color: string }[] = [
    { role: 'admin',              label: 'Admins',               color: 'text-purple-700' },
    { role: 'diretor_comercial',  label: 'Diretores Comerciais', color: 'text-blue-700'   },
    { role: 'comercial',          label: 'Comerciais',           color: 'text-green-700'  },
  ]

  const activeCount = users.filter(u => u.active !== false).length

  return (
    <div>
      <PageHeader
        title="Utilizadores"
        description={`${activeCount} ativos · ${users.length} total`}
        action={
          user?.role === 'admin' ? (
            <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
              <Plus size={16} /> Novo Utilizador
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ role, label, color }) => {
            const group = byRole(role)
            if (group.length === 0) return null
            return (
              <div key={role}>
                <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${color}`}>
                  {label} ({group.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.map((u) => {
                    const isActive = u.active !== false
                    const isSelf = u.id === user?.id
                    return (
                      <Card key={u.id} className={!isActive ? 'opacity-60' : ''}>
                        <CardBody className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar name={u.full_name} src={u.avatar_url} size="lg" />
                            {!isActive && (
                              <span className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full">
                                OFF
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{u.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${roleColor(u.role)}`}>
                              {roleLabel(u.role)}
                            </span>
                          </div>
                          {user?.role === 'admin' && (
                            <div className="flex flex-col gap-1 shrink-0">
                              <button
                                onClick={() => { setEditing(u); setModalOpen(true) }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                                title="Editar"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => diagnose(u)}
                                className="p-1.5 text-gray-400 hover:text-purple-600 rounded"
                                title="Diagnosticar conta"
                              >
                                <Search size={14} />
                              </button>
                              {!isSelf && isActive && (
                                <button
                                  onClick={() => adminAction(u.id, 'disable')}
                                  disabled={actionLoading === u.id + 'disable'}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                                  title="Desativar acesso"
                                >
                                  <Ban size={14} />
                                </button>
                              )}
                              {!isSelf && !isActive && (
                                <button
                                  onClick={() => adminAction(u.id, 'enable')}
                                  disabled={actionLoading === u.id + 'enable'}
                                  className="p-1.5 text-gray-400 hover:text-green-600 rounded"
                                  title="Reativar acesso"
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {diagResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Diagnóstico — {diagName}</h3>
            <div className="space-y-2 text-sm">
              {diagResult.exists === false ? (
                <p className="text-red-600 font-medium">⚠ Conta NÃO existe no Supabase Auth.<br/>O perfil existe mas o utilizador não foi criado no sistema de autenticação.</p>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-slate-500">Existe no Auth</span><span className="font-medium text-emerald-600">✓ Sim</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Email confirmado</span><span className={`font-medium ${diagResult.confirmed ? 'text-emerald-600' : 'text-red-600'}`}>{diagResult.confirmed ? '✓ Sim' : '✗ Não'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Conta banida</span><span className={`font-medium ${diagResult.banned ? 'text-red-600' : 'text-emerald-600'}`}>{diagResult.banned ? `✗ Sim (até ${String(diagResult.banned_until)})` : '✓ Não'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Último login</span><span className="text-slate-700">{diagResult.last_sign_in ? new Date(diagResult.last_sign_in as string).toLocaleString('pt-PT') : 'Nunca'}</span></div>
                </>
              )}
              {'error' in diagResult && <p className="text-red-500 text-xs mt-2">{String(diagResult.error)}</p>}
            </div>
            <div className="mt-5 flex flex-col gap-2">
              {diagResult.exists === true && !diagResult.confirmed && (
                <button
                  onClick={async () => {
                    const u = users.find(u => u.full_name === diagName)
                    if (!u) return
                    const res = await fetch('/api/admin/update-user', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: u.id, action: 'confirm_email' }),
                    })
                    if (res.ok) {
                      setDiagResult(prev => prev ? { ...prev, confirmed: true } : prev)
                    }
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium text-white transition-colors"
                >
                  Confirmar email agora
                </button>
              )}
              {diagResult.exists === false && (
                <button
                  onClick={async () => {
                    const u = users.find(u => u.full_name === diagName)
                    if (!u) return
                    setEditing(u)
                    setDiagResult(null)
                    setModalOpen(true)
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium text-white transition-colors"
                >
                  Recriar utilizador
                </button>
              )}
              <button onClick={() => setDiagResult(null)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <UserModal
          profile={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load() }}
        />
      )}
    </div>
  )
}
