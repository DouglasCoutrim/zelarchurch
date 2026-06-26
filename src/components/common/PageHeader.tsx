import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-6', className)}>
      <div>
        <h1
          className="font-bold text-[#0F172A] tracking-tight"
          style={{ fontSize: 22, letterSpacing: '-0.01em' }}
        >
          {title}
        </h1>
        {subtitle && <p className="text-[#64748B] text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </div>
  )
}
