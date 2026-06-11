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
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, empresa ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-slate-300"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ClientStatus | 'todos')}
          className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-slate-300"
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
        <Card><CardBody className="text-center py-12">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Building2 size={20} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Nenhum cliente encontrado</p>
          <p className="text-slate-400 text-sm mt-1">Tente ajustar os filtros ou adicione um novo cliente</p>
        </CardBody></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((client) => {
            const { label, variant } = statusConfig[client.status]
            return (
              <Card key={client.id} onClick={() => { setEditing(client); setModalOpen(true) }}>
                <CardBody>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-blue-600">{client.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{client.name}</p>
                        {client.company && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <Building2 size={11} /> {client.company}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={variant} dot>{label}</Badge>
                  </div>
                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    {client.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail size={11} className="text-slate-400 shrink-0" /> <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone size={11} className="text-slate-400 shrink-0" /> {client.phone}
                      </div>
                    )}
                    {client.sector && (
                      <p className="text-xs text-slate-400">{client.sector}</p>
                    )}
                  </div>
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
