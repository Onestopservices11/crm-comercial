'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Client, ClientStatus } from '@/types'
import { Plus, Search, Phone, Mail, Building2 } from 'lucide-react'
import { ClientModal } from '@/modules/clientes/client-modal'

const statusConfig: Record<ClientStatus, { label: string; variant: 'default' | 'info' | 'success' | 'warning' | 'danger' }> = {
  lead: { label: 'Lead', variant: 'default' },
  prospect: { label: 'Prospect', variant: 'info' },
  ativo: { label: 'Ativo', variant: 'success' },
  inativo: { label: 'Inativo', variant: 'warning' },
  arquivado: { label: 'Arquivado', variant: 'danger' },
}

export default function ClientesPage() {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ClientStatus | 'todos'>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*, owner:profiles(id,full_name)')
      .order('name')
    setClients(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = clients.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'todos' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={`${clients.length} clientes registados`}
        action={
          <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={16} /> Novo Cliente
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, empresa ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ClientStatus | 'todos')}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos os estados</option>
          {Object.entries(statusConfig).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardBody className="text-center py-10"><p className="text-gray-400">Nenhum cliente encontrado.</p></CardBody></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((client) => {
            const { label, variant } = statusConfig[client.status]
            return (
              <Card key={client.id} onClick={() => { setEditing(client); setModalOpen(true) }}>
                <CardBody>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{client.name}</p>
                      {client.company && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <Building2 size={11} /> {client.company}
                        </div>
                      )}
                    </div>
                    <Badge variant={variant}>{label}</Badge>
                  </div>
                  <div className="space-y-1 mt-2">
                    {client.email && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Mail size={11} /> {client.email}
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Phone size={11} /> {client.phone}
                      </div>
                    )}
                  </div>
                  {client.sector && (
                    <p className="text-xs text-gray-400 mt-2">{client.sector}</p>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <ClientModal
          client={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load() }}
        />
      )}
    </div>
  )
}
