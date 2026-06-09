'use client'

import { Opportunity, PipelineStage } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Pencil, Trash2, ArrowRight } from 'lucide-react'

interface OpportunityCardProps {
  opportunity: Opportunity
  stages: { key: PipelineStage; label: string }[]
  onEdit: () => void
  onStageChange: (id: string, stage: PipelineStage) => void
  onDelete: (id: string) => void
}

export function OpportunityCard({ opportunity, stages, onEdit, onStageChange, onDelete }: OpportunityCardProps) {
  const currentIdx = stages.findIndex((s) => s.key === opportunity.stage)
  const nextStage = stages[currentIdx + 1]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-gray-900 leading-tight">{opportunity.title}</p>
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="text-gray-400 hover:text-blue-600">
            <Pencil size={12} />
          </button>
          <button onClick={() => onDelete(opportunity.id)} className="text-gray-400 hover:text-red-600">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {opportunity.client && (
        <p className="text-xs text-gray-500 mb-2">{opportunity.client.name}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">{formatCurrency(opportunity.value)}</span>
        {opportunity.expected_close_date && (
          <span className="text-xs text-gray-400">{formatDate(opportunity.expected_close_date)}</span>
        )}
      </div>

      {nextStage && (
        <button
          onClick={() => onStageChange(opportunity.id, nextStage.key)}
          className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded py-1 transition-colors"
        >
          Mover para {nextStage.label} <ArrowRight size={11} />
        </button>
      )}
    </div>
  )
}
