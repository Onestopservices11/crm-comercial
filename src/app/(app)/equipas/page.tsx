'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Team, UserProfile } from '@/types'
import { Plus, Users, Pencil, Trash2 } from 'lucide-react'
import { roleLabel, roleColor } from '@/lib/utils'
import { TeamModal } from '@/modules/equipas/team-modal'

export default function EquipasPage() {
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [members, setMembers] = useState<Record<string, UserProfile[]>>({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Team | null>(null)
  const supabase = createClient()

  const loadTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*, director:profiles!teams_director_id_fkey(*)')
      .order('created_at', { ascending: false })

    if (data) {
      setTeams(data)
      // Load members for each team
      for (const team of data) {
        const { data: memberData } = await supabase
          .from('team_members')
          .select('*, user:profiles(*)')
          .eq('team_id', team.id)
        if (memberData) {
          setMembers((prev) => ({
            ...prev,
            [team.id]: memberData.map((m: { user: UserProfile }) => m.user),
          }))
        }
      }
    }
    setLoading(false)
  }

  useEffect(() => { loadTeams() }, [])

  const handleDelete = async (teamId: string) => {
    if (!confirm('Tens a certeza que queres apagar esta equipa?')) return
    await supabase.from('teams').delete().eq('id', teamId)
    loadTeams()
  }

  const canManage = user?.role === 'admin' || user?.role === 'diretor_comercial'

  return (
    <div>
      <PageHeader
        title="Equipas"
        description="Gere as equipas comerciais e os seus membros"
        action={
          canManage ? (
            <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
              <Plus size={16} /> Nova Equipa
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhuma equipa criada ainda.</p>
            {canManage && (
              <Button className="mt-4" onClick={() => setModalOpen(true)}>
                <Plus size={16} /> Criar primeira equipa
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    {team.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{team.description}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditing(team); setModalOpen(true) }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(team.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                {team.director && (
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar name={team.director.full_name} size="sm" />
                    <div>
                      <p className="text-xs text-gray-500">Diretor</p>
                      <p className="text-sm font-medium text-gray-700">{team.director.full_name}</p>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardBody>
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Membros ({members[team.id]?.length ?? 0})
                </p>
                <div className="flex flex-wrap gap-2">
                  {members[team.id]?.map((member) => (
                    <div key={member.id} className="flex items-center gap-1.5">
                      <Avatar name={member.full_name} size="sm" />
                      <div>
                        <p className="text-xs font-medium text-gray-700">{member.full_name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${roleColor(member.role)}`}>
                          {roleLabel(member.role)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!members[team.id] || members[team.id].length === 0) && (
                    <p className="text-sm text-gray-400">Sem membros</p>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <TeamModal
          team={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); loadTeams() }}
        />
      )}
    </div>
  )
}
