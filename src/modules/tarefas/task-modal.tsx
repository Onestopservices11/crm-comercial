'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Task, UserProfile } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { X } from 'lucide-react'

interface TaskModalProps {
  task: Task | null
  onClose: () => void
  onSaved: () => void
}

export function TaskModal({ task, onClose, onSaved }: TaskModalProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? user?.id ?? '')
  const [priority, setPriority] = useState(task?.priority ?? 'normal')
  const [status, setStatus] = useState(task?.status ?? 'por_fazer')
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.slice(0, 16) : '')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('profiles').select('*').order('full_name').then(({ data }) => setUsers(data ?? []))
  }, [])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)

    const payload = {
      title,
      description: description || null,
      assigned_to: assignedTo || user?.id,
      created_by: task?.created_by ?? user?.id,
      priority,
      status,
      due_date: dueDate || null,
    }

    if (task) {
      await supabase.from('tasks').update(payload).eq('id', task.id)
    } else {
      await supabase.from('tasks').insert(payload)
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{task ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Enviar proposta ao cliente" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descrição</label>
            <textarea
              rows={2}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Select
            label="Atribuir a"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            options={users.map((u) => ({ value: u.id, label: u.full_name }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Prioridade"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Task['priority'])}
              options={[
                { value: 'baixa', label: 'Baixa' },
                { value: 'normal', label: 'Normal' },
                { value: 'alta', label: 'Alta' },
                { value: 'urgente', label: 'Urgente' },
              ]}
            />
            <Select
              label="Estado"
              value={status}
              onChange={(e) => setStatus(e.target.value as Task['status'])}
              options={[
                { value: 'por_fazer', label: 'Por Fazer' },
                { value: 'em_progresso', label: 'Em Progresso' },
                { value: 'concluida', label: 'Concluída' },
                { value: 'cancelada', label: 'Cancelada' },
              ]}
            />
          </div>
          <Input label="Prazo" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="flex gap-3 justify-end px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'A guardar...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
