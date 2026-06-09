'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Procedure } from '@/types'
import { Plus, BookOpen, CheckCircle, Search } from 'lucide-react'
import { isDirector } from '@/lib/utils'
import { ProcedureModal } from '@/modules/procedimentos/procedure-modal'
import { ProcedureView } from '@/modules/procedimentos/procedure-view'

export default function ProcedimentosPage() {
  const { user } = useAuth()
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [reads, setReads] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('todas')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Procedure | null>(null)
  const [viewing, setViewing] = useState<Procedure | null>(null)
  const supabase = createClient()

  const load = async () => {
    const [{ data: procs }, { data: readData }] = await Promise.all([
      supabase.from('procedures').select('*, creator:profiles(id,full_name)').order('created_at', { ascending: false }),
      supabase.from('procedure_reads').select('procedure_id').eq('user_id', user?.id ?? ''),
    ])
    setProcedures(procs ?? [])
    setReads((readData ?? []).map((r: { procedure_id: string }) => r.procedure_id))
    setLoading(false)
  }

  useEffect(() => { if (user) load() }, [user])

  const markAsRead = async (id: string) => {
    await supabase.from('procedure_reads').upsert({ procedure_id: id, user_id: user?.id })
    setReads((prev) => [...prev, id])
  }

  const categories = ['todas', ...Array.from(new Set(procedures.map((p) => p.category)))]

  const filtered = procedures.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCategory === 'todas' || p.category === filterCategory
    return matchSearch && matchCat
  })

  const canManage = isDirector(user?.role ?? 'comercial')

  return (
    <div>
      <PageHeader
        title="Procedimentos"
        description="Playbooks e procedimentos operacionais da equipa"
        action={
          canManage ? (
            <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
              <Plus size={16} /> Novo Procedimento
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map((c) => <option key={c} value={c}>{c === 'todas' ? 'Todas as categorias' : c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhum procedimento encontrado.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((proc) => {
            const isRead = reads.includes(proc.id)
            return (
              <Card key={proc.id} onClick={() => setViewing(proc)}>
                <CardBody>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{proc.title}</p>
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                        {proc.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {!proc.is_published && <Badge variant="warning">Rascunho</Badge>}
                      {isRead && <CheckCircle size={16} className="text-green-500" />}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{proc.content.slice(0, 120)}...</p>
                  {proc.creator && (
                    <p className="text-xs text-gray-400 mt-2">por {proc.creator.full_name}</p>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <ProcedureModal
          procedure={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load() }}
        />
      )}

      {viewing && (
        <ProcedureView
          procedure={viewing}
          isRead={reads.includes(viewing.id)}
          canManage={canManage}
          onMarkRead={() => markAsRead(viewing.id)}
          onEdit={() => { setEditing(viewing); setViewing(null); setModalOpen(true) }}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}
