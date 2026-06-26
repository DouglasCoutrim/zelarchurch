import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

type IconColor = 'navy' | 'gold' | 'green' | 'red'

interface MetricCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  iconColor?: IconColor
  change?: number
  changeLabel?: string
  className?: string
}

const iconBg: Record<IconColor, string> = {
  navy: 'bg-[#EEF2FB] text-[#1B3A6B]',
  gold: 'bg-[#FBF3DC] text-[#A07D1A]',
  green: 'bg-[#D1FAE5] text-[#059669]',
  red: 'bg-[#FEE2E2] text-[#B91C1C]',
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor = 'navy',
  change,
  changeLabel = 'vs mês anterior',
  className,
}: MetricCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-[#E2E8F0] p-5 transition-all duration-200',
        'hover:shadow-[0_4px_12px_rgba(15,35,71,.08)] hover:-translate-y-[1px]',
        className,
      )}
      style={{ boxShadow: '0 1px 3px rgba(15,35,71,.07)' }}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', iconBg[iconColor])}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#94A3B8] mb-1">{label}</p>
      <p
        className="font-extrabold text-[#0F172A] leading-tight"
        style={{ fontSize: 24, letterSpacing: '-0.02em' }}
      >
        {value}
      </p>
      {change !== undefined && (
        <div
          className={cn(
            'flex items-center gap-1 mt-1.5 text-xs font-semibold',
            isPositive ? 'text-[#059669]' : isNegative ? 'text-[#B91C1C]' : 'text-[#64748B]',
          )}
        >
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : isNegative ? (
            <TrendingDown className="w-3.5 h-3.5" />
          ) : (
            <Minus className="w-3.5 h-3.5" />
          )}
          <span>
            {change > 0 ? '+' : ''}
            {change.toFixed(1)}% {changeLabel}
          </span>
        </div>
      )}
    </div>
  )
}
