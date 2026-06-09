'use client'

import { Procedure } from '@/types'
import { Button } from '@/components/ui/button'
import { X, CheckCircle, Pencil } from 'lucide-react'

interface ProcedureViewProps {
  procedure: Procedure
  isRead: boolean
  canManage: boolean
  onMarkRead: () => void
  onEdit: () => void
  onClose: () => void
}

export function ProcedureView({ procedure, isRead, canManage, onMarkRead, onEdit, onClose }: ProcedureViewProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{procedure.category}</span>
            <h2 className="text-lg font-semibold mt-1">{procedure.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">{procedure.content}</pre>
          </div>
        </div>
        <div className="flex gap-3 justify-between px-6 py-4 border-t">
          <div className="flex gap-2">
            {!isRead && (
              <Button variant="secondary" onClick={onMarkRead}>
                <CheckCircle size={14} /> Marcar como lido
              </Button>
            )}
            {isRead && (
              <div className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle size={16} /> Lido
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Button variant="secondary" onClick={onEdit}>
                <Pencil size={14} /> Editar
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
