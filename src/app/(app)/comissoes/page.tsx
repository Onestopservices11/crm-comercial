'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Commission, CommissionStatus } from '@/types'
import { formatCurrency, formatDate, isAdmin } from '@/lib/utils'
import { CheckCircle, DollarSign } from 'lucide-react'

const statusConfig: Record<CommissionStatus, { label: string; variant: 'warning' | 'info' | 'success' }> = {
  pendente: { label: 'Pendente', variant: 'warning' },
  aprovada: { label: 'Aprovada', variant: 'info' },
  paga: { label: 'Paga', variant: 'success' },
}

export default function ComissoesPage() {
  const { user } = useAuth()
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from('commissions')
      .select('*, opportunity:opportunities(id,title), user:profiles(id,full_name)')
      .order('created_at', { ascending: false })
    setCommissions(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: CommissionStatus) => {
    const update: Record<string, unknown> = { status }
    if (status === 'paga') update.paid_at = new Date().toISOString()
    if (status === 'aprovada') update.approved_by = user?.id
    await supabase.from('commissions').update(update).eq('id', id)
    load()
  }

  const total = commissions.reduce((sum, c) => sum + c.amount, 0)
  const totalPago = commissions.filter((c) => c.status === 'paga').reduce((sum, c) => sum + c.amount, 0)
  const totalPendente = commissions.filter((c) => c.status === 'pendente').reduce((sum, c) => sum + c.amount, 0)

  return (
    <div>
      <PageHeader title="Comissões" description="Gestão e acompanhamento de comissões" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total', value: formatCurrency(total), color: 'text-gray-900' },
          { label: 'Pendente', value: formatCurrency(totalPendente), color: 'text-yellow-600' },
          { label: 'Pago', value: formatCurrency(totalPago), color: 'text-green-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody className="text-center py-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : commissions.length === 0 ? (
        <Card><CardBody className="text-center py-10"><p className="text-gray-400">Nenhuma comissão registada.</p></CardBody></Card>
      ) : (
        <div className="space-y-2">
          {commissions.map((c) => {
            const { label, variant } = statusConfig[c.status]
            return (
              <Card key={c.id}>
                <CardBody className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {c.opportunity?.title ?? 'Oportunidade'}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {c.user && <span className="text-xs text-gray-500">{c.user.full_name}</span>}
                      <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(c.amount)}</span>
                  <Badge variant={variant}>{label}</Badge>
                  {isAdmin(user?.role ?? 'comercial') && c.status === 'pendente' && (
                    <Button size="sm" variant="secondary" onClick={() => updateStatus(c.id, 'aprovada')}>
                      <CheckCircle size={14} /> Aprovar
                    </Button>
                  )}
                  {isAdmin(user?.role ?? 'comercial') && c.status === 'aprovada' && (
                    <Button size="sm" onClick={() => updateStatus(c.id, 'paga')}>
                      <DollarSign size={14} /> Pagar
                    </Button>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
