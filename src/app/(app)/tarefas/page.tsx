'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Task, TaskStatus, TaskPriority } from '@/types'
import { Plus, CheckCircle2, Clock, XCircle, Circle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { TaskModal } from '@/modules/tarefas/task-modal'

const statusConfig: Record<TaskStatus, { label: string; icon: React.ElementType; color: string }> = {
  por_fazer: { label: 'Por Fazer', icon: Circle, color: 'text-slate-400' },
  em_progresso: { label: 'Em Progresso', icon: Clock, color: 'text-blue-500' },
  concluida: { label: 'Concluída', icon: CheckCircle2, color: 'text-emerald-500' },
  cancelada: { label: 'Cancelada', icon: XCircle, color: 'text-red-400' },
}

const priorityBadge: Record<TaskPriority, { label: string; variant: 'default' | 'info' | 'warning' | 'danger' }> = {
  baixa: { label: 'Baixa', variant: 'default' },
  normal: { label: 'Normal', variant: 'info' },
  alta: { label: 'Alta', variant: 'warning' },
  urgente: { label: 'Urgente', variant: 'danger' },
}

export default function TarefasPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TaskStatus | 'todas'>('todas')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, assignee:profiles!tasks_assigned_to_fkey(id,full_name), creator:profiles!tasks_created_by_fkey(id,full_name)')
      .order('due_date', { ascending: true, nullsFirst: false })
    setTasks(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: TaskStatus) => {
    await supabase.from('tasks').update({ status }).eq('id', id)
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t))
  }

  const filtered = filter === 'todas' ? tasks : tasks.filter((t) => t.status === filter)

  return (
    <div>
      <PageHeader
        title="Tarefas"
        description={`${tasks.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').length} tarefas ativas`}
        action={
          <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={16} /> Nova Tarefa
          </Button>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {(['todas', 'por_fazer', 'em_progresso', 'concluida', 'cancelada'] as const).map((s) => {
          const count = s === 'todas' ? tasks.length : tasks.filter(t => t.status === s).length
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all ${
                filter === s
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {s === 'todas' ? 'Todas' : statusConfig[s].label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === s ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody className="text-center py-10">
            <p className="text-gray-400">Nenhuma tarefa encontrada.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const { icon: Icon, color } = statusConfig[task.status]
            const { label: prLabel, variant: prVariant } = priorityBadge[task.priority]
            return (
              <Card key={task.id}>
                <CardBody className="flex items-center gap-4 py-3">
                  <button
                    onClick={() => updateStatus(task.id, task.status === 'concluida' ? 'por_fazer' : 'concluida')}
                    className={`shrink-0 ${color}`}
                  >
                    <Icon size={20} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === 'concluida' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      {task.assignee && (
                        <span className="text-xs text-slate-400">Para: {task.assignee.full_name}</span>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-slate-400">{formatDate(task.due_date)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={prVariant}>{prLabel}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditing(task); setModalOpen(true) }}
                    >
                      Editar
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <TaskModal
          task={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load() }}
        />
      )}
    </div>
  )
}
