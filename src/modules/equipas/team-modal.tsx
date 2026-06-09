'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Team, UserProfile } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Avatar } from '@/components/ui/avatar'
import { roleLabel, roleColor } from '@/lib/utils'
import { X, Check } from 'lucide-react'

interface TeamModalProps {
  team: Team | null
  onClose: () => void
  onSaved: () => void
}

export function TeamModal({ team, onClose, onSaved }: TeamModalProps) {
  const [name, setName] = useState(team?.name ?? '')
  const [description, setDescription] = useState(team?.description ?? '')
  const [directorId, setDirectorId] = useState(team?.director_id ?? '')
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: users } = await supabase.from('profiles').select('*').order('full_name')
      setAllUsers(users ?? [])

      if (team) {
        const { data: members } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', team.id)
        setSelectedMembers((members ?? []).map((m: { user_id: string }) => m.user_id))
      }
    }
    load()
  }, [])

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)

    let teamId = team?.id

    if (team) {
      await supabase.from('teams').update({ name, description, director_id: directorId || null }).eq('id', team.id)
    } else {
      const { data } = await supabase
        .from('teams')
        .insert({ name, description, director_id: directorId || null })
        .select('id')
        .single()
      teamId = data?.id
    }

    if (teamId) {
      // Substituir membros: apagar todos e reinserir os selecionados
      await supabase.from('team_members').delete().eq('team_id', teamId)
      if (selectedMembers.length > 0) {
        await supabase.from('team_members').insert(
          selectedMembers.map(userId => ({ team_id: teamId, user_id: userId }))
        )
      }
    }

    setSaving(false)
    onSaved()
  }

  const directors = allUsers.filter(u => u.role === 'admin' || u.role === 'diretor_comercial')
  const comerciais = allUsers.filter(u => u.role === 'comercial')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{team ? 'Editar Equipa' : 'Nova Equipa'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <Input
            label="Nome da equipa"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Equipa Norte"
          />
          <Input
            label="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição breve"
          />
          <Select
            label="Diretor Comercial responsável"
            value={directorId}
            onChange={(e) => setDirectorId(e.target.value)}
            options={[
              { value: '', label: 'Sem diretor atribuído' },
              ...directors.map((d) => ({ value: d.id, label: d.full_name })),
            ]}
          />

          {/* Seleção de membros */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Membros da equipa
              {selectedMembers.length > 0 && (
                <span className="ml-2 text-xs text-blue-600 font-normal">{selectedMembers.length} selecionados</span>
              )}
            </p>

            {allUsers.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum utilizador disponível.</p>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                {allUsers.map((u) => {
                  const selected = selectedMembers.includes(u.id)
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleMember(u.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${selected ? 'bg-blue-50' : ''}`}
                    >
                      <Avatar name={u.full_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.full_name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${roleColor(u.role)}`}>
                          {roleLabel(u.role)}
                        </span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      }`}>
                        {selected && <Check size={11} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'A guardar...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
