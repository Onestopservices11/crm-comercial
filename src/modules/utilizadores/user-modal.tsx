'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserProfile, UserRole } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { X, KeyRound } from 'lucide-react'

interface UserModalProps {
  profile: UserProfile | null
  onClose: () => void
  onSaved: () => void
}

export function UserModal({ profile, onClose, onSaved }: UserModalProps) {
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [email, setEmail] = useState(profile?.email ?? '')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [role, setRole] = useState<UserRole>(profile?.role ?? 'comercial')
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const [showResetPw, setShowResetPw] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim()) return
    if (!profile && !password.trim()) { setError('Password obrigatória para novo utilizador.'); return }
    setSaving(true)
    setError('')

    if (profile) {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, action: 'update_profile', full_name: fullName, role }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro ao atualizar.'); setSaving(false); return }
    } else {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, role }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro ao criar utilizador.'); setSaving(false); return }
    }

    setSaving(false)
    onSaved()
  }

  const handleResetPassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) { setError('Password mínima de 6 caracteres.'); return }
    setResetting(true)
    setError('')
    const res = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile!.id, action: 'reset_password', password: newPassword }),
    })
    const json = await res.json()
    setResetting(false)
    if (!res.ok) { setError(json.error ?? 'Erro ao redefinir password.'); return }
    setShowResetPw(false)
    setNewPassword('')
    setError('')
    alert('Password atualizada com sucesso.')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {profile ? 'Editar Utilizador' : 'Novo Utilizador'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <Input
            label="Nome completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nome do utilizador"
          />

          {!profile ? (
            <>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@empresa.com"
              />
              <Input
                label="Password inicial"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </>
          ) : (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
              {profile.email}
            </div>
          )}

          <Select
            label="Perfil"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={[
              { value: 'comercial', label: 'Comercial' },
              { value: 'diretor_comercial', label: 'Diretor Comercial' },
              { value: 'admin', label: 'Admin' },
            ]}
          />

          {/* Reset password (só em edição) */}
          {profile && (
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <button
                onClick={() => setShowResetPw(!showResetPw)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <KeyRound size={15} />
                Redefinir password
              </button>
              {showResetPw && (
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nova password"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button size="sm" onClick={handleResetPassword} disabled={resetting}>
                    {resetting ? '...' : 'Definir'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex gap-3 justify-end px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !fullName.trim()}>
            {saving ? 'A guardar...' : profile ? 'Guardar' : 'Criar Utilizador'}
          </Button>
        </div>
      </div>
    </div>
  )
}
