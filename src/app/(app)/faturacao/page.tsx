'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Invoice, InvoiceStatus } from '@/types'
import { formatCurrency, formatDate, isDirector } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { InvoiceModal } from '@/modules/faturacao/invoice-modal'

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'info' | 'success' | 'danger' }> = {
  emitida: { label: 'Emitida', variant: 'default' },
  enviada: { label: 'Enviada', variant: 'info' },
  paga: { label: 'Paga', variant: 'success' },
  em_atraso: { label: 'Em Atraso', variant: 'danger' },
}

export default function FaturacaoPage() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*, opportunity:opportunities(id,title), user:profiles(id,full_name)')
      .order('issued_at', { ascending: false })
    setInvoices(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalPago = invoices.filter((i) => i.status === 'paga').reduce((s, i) => s + i.amount, 0)
  const totalPendente = invoices.filter((i) => i.status !== 'paga').reduce((s, i) => s + i.amount, 0)

  return (
    <div>
      <PageHeader
        title="Faturação"
        description="Registo e acompanhamento de faturas"
        action={
          <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={16} /> Nova Fatura
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Faturado', value: formatCurrency(invoices.reduce((s, i) => s + i.amount, 0)) },
          { label: 'Recebido', value: formatCurrency(totalPago) },
          { label: 'Pendente', value: formatCurrency(totalPendente) },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody className="text-center py-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => {
            const { label, variant } = statusConfig[inv.status]
            return (
              <Card key={inv.id} onClick={() => { setEditing(inv); setModalOpen(true) }}>
                <CardBody className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{inv.number}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {inv.opportunity && <span className="text-xs text-gray-500">{inv.opportunity.title}</span>}
                      {inv.user && <span className="text-xs text-gray-400">{inv.user.full_name}</span>}
                      <span className="text-xs text-gray-400">{formatDate(inv.issued_at)}</span>
                    </div>
                  </div>
                  <span className="text-lg font-bold">{formatCurrency(inv.amount)}</span>
                  <Badge variant={variant}>{label}</Badge>
                </CardBody>
              </Card>
            )
          })}
          {invoices.length === 0 && (
            <Card><CardBody className="text-center py-10"><p className="text-gray-400">Nenhuma fatura registada.</p></CardBody></Card>
          )}
        </div>
      )}

      {modalOpen && (
        <InvoiceModal
          invoice={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load() }}
        />
      )}
    </div>
  )
}
