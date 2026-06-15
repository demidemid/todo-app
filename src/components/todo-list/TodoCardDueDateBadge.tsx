import { CalendarDays } from 'lucide-react';
import type { DueDateState } from '../../utils/dueDate';

interface TodoCardDueDateBadgeProps {
  dueLabel: string | null;
  dueState: DueDateState | null;
  testId?: string;
  title?: string;
}

export const TodoCardDueDateBadge = ({ dueLabel, dueState, testId, title }: TodoCardDueDateBadgeProps) => {
  if (!dueLabel) {
    return null;
  }

  const toneClassName = dueState === 'overdue'
    ? 'border-rose-300/35 bg-rose-400/15 text-rose-100'
    : dueState === 'due_today' || dueState === 'due_tomorrow'
      ? 'border-amber-300/35 bg-amber-300/15 text-amber-100'
      : 'border-slate-300/25 bg-slate-300/10 text-slate-200';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClassName}`}
      data-testid={testId}
      title={title}
    >
      <CalendarDays size={12} className="mr-1" aria-hidden="true" />
      {dueLabel}
    </span>
  );
};