import type { ReactNode } from 'react'

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  testId?: string
}

interface SegmentedProps<T extends string> {
  value: T
  options: Array<SegmentedOption<T>>
  onChange: (nextValue: T) => void
  ariaLabel: string
  className?: string
}

export const Segmented = <T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: SegmentedProps<T>) => {
  return (
    <div
      className={[
        'inline-flex items-center rounded-full border border-white/15 bg-slate-950/60 p-1',
        className ?? '',
      ].join(' ')}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map(option => {
        const active = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={[
              'rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition md:px-4',
              active
                ? 'bg-cyan-300 text-slate-900'
                : 'text-slate-300 hover:bg-white/10 hover:text-white',
            ].join(' ')}
            data-testid={option.testId}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
