import { cn } from '@/lib/utils'

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  ativo: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981', label: 'Ativo' },
  active: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981', label: 'Ativo' },
  inativo: { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8', label: 'Inativo' },
  inactive: { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8', label: 'Inativo' },
  visitante: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6', label: 'Visitante' },
  visitor: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6', label: 'Visitante' },
  afastado: { bg: '#FBF3DC', text: '#92400E', dot: '#C49A2A', label: 'Afastado' },
  suspended: { bg: '#FBF3DC', text: '#92400E', dot: '#C49A2A', label: 'Afastado' },
  excluido: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444', label: 'Excluído' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444', label: 'Cancelado' },
  trial: { bg: '#FBF3DC', text: '#92400E', dot: '#C49A2A', label: 'Trial' },
  pago: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981', label: 'Pago' },
  paid: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981', label: 'Pago' },
  pendente: { bg: '#FBF3DC', text: '#92400E', dot: '#C49A2A', label: 'Pendente' },
  pending: { bg: '#FBF3DC', text: '#92400E', dot: '#C49A2A', label: 'Pendente' },
  aprovado: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981', label: 'Aprovado' },
  approved: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981', label: 'Aprovado' },
  reprovado: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444', label: 'Reprovado' },
  rejected: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444', label: 'Rejeitado' },
}

interface StatusBadgeProps {
  status: string
  customLabel?: string
  showDot?: boolean
  className?: string
}

export function StatusBadge({ status, customLabel, showDot = true, className }: StatusBadgeProps) {
  const cfg = statusConfig[status.toLowerCase()] ?? {
    bg: '#F1F5F9',
    text: '#475569',
    dot: '#94A3B8',
    label: status,
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold',
        className,
      )}
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
      )}
      {customLabel ?? cfg.label}
    </span>
  )
}
