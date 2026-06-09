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
  por_fazer: { label: 'Por Fazer', icon: Circle, color: 'text-gray-500' },
  em_progresso: { label: 'Em Progresso', icon: Clock, color: 'text-blue-500' },
  concluida: { label: 'Concluída', icon: CheckCircle2, color: 'text-green-500' },
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
      <div className="flex gap-2 mb-5 border-b border-gray-200">
        {(['todas', 'por_fazer', 'em_progresso', 'concluida', 'cancelada'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === s
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s === 'todas' ? 'Todas' : statusConfig[s].label}
            {s !== 'todas' && (
              <span className="ml-1.5 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
                {tasks.filter(t => t.status === s).length}
              </span>
            )}
          </button>
        ))}
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
                    <p className={`text-sm font-medium ${task.status === 'concluida' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      {task.assignee && (
                        <span className="text-xs text-gray-400">Para: {task.assignee.full_name}</span>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-gray-400">{formatDate(task.due_date)}</span>
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
