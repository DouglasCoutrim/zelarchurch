import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      <div className="w-16 h-16 bg-[#F1F5F9] rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[#94A3B8]" />
      </div>
      <p className="text-[15px] font-semibold text-[#334155] mb-1.5">{title}</p>
      {description && (
        <p className="text-sm text-[#64748B] max-w-[280px] leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
