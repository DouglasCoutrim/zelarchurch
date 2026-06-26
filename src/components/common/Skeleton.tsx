import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'card' | 'avatar' | 'button' | 'custom'
  style?: React.CSSProperties
}

const variants = {
  text: 'h-4 w-full rounded',
  card: 'h-32 w-full rounded-xl',
  avatar: 'h-9 w-9 rounded-full',
  button: 'h-9 w-24 rounded-lg',
  custom: '',
}

const shimmer =
  'bg-gradient-to-r from-[#F1F5F9] via-[#E2E8F0] to-[#F1F5F9] bg-[length:200%_100%] animate-shimmer'

export function Skeleton({ className, variant = 'text', style }: SkeletonProps) {
  return <div className={cn(shimmer, variants[variant], className)} style={style} />
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 rounded" style={{ width: `${60 + (i % 3) * 15}%` }} />
        </td>
      ))}
    </tr>
  )
}

export function MetricCardSkeleton() {
  return (
    <div
      className="bg-white rounded-xl border border-[#E2E8F0] p-5"
      style={{ boxShadow: '0 1px 3px rgba(15,35,71,.07)' }}
    >
      <Skeleton variant="custom" className="h-10 w-10 rounded-xl mb-3" />
      <Skeleton variant="custom" className="h-3 w-20 rounded mb-2" />
      <Skeleton variant="custom" className="h-7 w-32 rounded mb-2" />
      <Skeleton variant="custom" className="h-3 w-24 rounded" />
    </div>
  )
}
