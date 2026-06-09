'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Procedure } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

interface ProcedureModalProps {
  procedure: Procedure | null
  onClose: () => void
  onSaved: () => void
}

export function ProcedureModal({ procedure, onClose, onSaved }: ProcedureModalProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState(procedure?.title ?? '')
  const [category, setCategory] = useState(procedure?.category ?? '')
  const [content, setContent] = useState(procedure?.content ?? '')
  const [isPublished, setIsPublished] = useState(procedure?.is_published ?? false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!title.trim() || !category.trim()) return
    setSaving(true)

    const payload = {
      title,
      category,
      content,
      is_published: isPublished,
      created_by: procedure?.created_by ?? user?.id,
    }

    if (procedure) {
      await supabase.from('procedures').update(payload).eq('id', procedure.id)
    } else {
      await supabase.from('procedures').insert(payload)
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{procedure ? 'Editar Procedimento' : 'Novo Procedimento'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Como fazer prospeção" />
          <Input label="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Prospeção, Fecho, Pós-venda" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Conteúdo</label>
            <textarea
              rows={12}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreve aqui o procedimento completo..."
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Publicar (visível para toda a equipa)</span>
          </label>
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
