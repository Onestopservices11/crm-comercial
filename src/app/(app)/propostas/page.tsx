'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Proposal, ProposalStatus } from '@/types'
import { formatDate } from '@/lib/utils'
import { Plus, FileEdit } from 'lucide-react'
import { ProposalModal } from '@/modules/propostas/proposal-modal'

const statusConfig: Record<ProposalStatus, { label: string; variant: 'default' | 'info' | 'warning' | 'success' | 'danger' }> = {
  rascunho: { label: 'Rascunho', variant: 'default' },
  enviada: { label: 'Enviada', variant: 'info' },
  negociacao: { label: 'Negociação', variant: 'warning' },
  aceite: { label: 'Aceite', variant: 'success' },
  recusada: { label: 'Recusada', variant: 'danger' },
}

export default function PropostasPage() {
  const { user } = useAuth()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Proposal | null>(null)
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from('proposals')
      .select('*, client:clients(id,name), owner:profiles(id,full_name)')
      .order('created_at', { ascending: false })
    setProposals(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader
        title="Propostas"
        description={`${proposals.filter(p => p.status !== 'recusada').length} propostas ativas`}
        action={
          <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={16} /> Nova Proposta
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : proposals.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <FileEdit size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhuma proposta criada.</p>
            <Button className="mt-4" onClick={() => setModalOpen(true)}><Plus size={16} /> Criar proposta</Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {proposals.map((p) => {
            const { label, variant } = statusConfig[p.status]
            return (
              <Card key={p.id} onClick={() => { setEditing(p); setModalOpen(true) }}>
                <CardBody className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{p.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {p.client && <span className="text-xs text-gray-500">{p.client.name}</span>}
                      {p.owner && <span className="text-xs text-gray-400">{p.owner.full_name}</span>}
                      <span className="text-xs text-gray-400">v{p.version}</span>
                    </div>
                  </div>
                  {p.valid_until && (
                    <span className="text-xs text-gray-400 shrink-0">Válida até {formatDate(p.valid_until)}</span>
                  )}
                  <Badge variant={variant}>{label}</Badge>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <ProposalModal
          proposal={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load() }}
        />
      )}
    </div>
  )
}
