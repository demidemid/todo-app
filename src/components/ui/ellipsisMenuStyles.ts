type EllipsisMenuTone = 'default' | 'danger';

interface EllipsisMenuItemClassOptions {
  tone?: EllipsisMenuTone;
  disabled?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

const ELLIPSIS_MENU_ITEM_BASE_CLASS = 'flex w-full items-center gap-3 px-4 py-2 text-left text-sm whitespace-nowrap focus:outline-none';
const ELLIPSIS_MENU_ITEM_TONE_CLASS: Record<EllipsisMenuTone, string> = {
  default: 'text-slate-100 hover:bg-cyan-900/40 focus:bg-cyan-900/40',
  danger: 'text-rose-200 hover:bg-rose-500/20 focus:bg-rose-500/20',
};

export const getEllipsisMenuItemClassName = ({
  tone = 'default',
  disabled = false,
  isFirst = false,
  isLast = false,
}: EllipsisMenuItemClassOptions = {}): string => [
  ELLIPSIS_MENU_ITEM_BASE_CLASS,
  ELLIPSIS_MENU_ITEM_TONE_CLASS[tone],
  disabled ? 'cursor-not-allowed opacity-50' : null,
  isFirst ? 'rounded-t-lg' : null,
  isLast ? 'rounded-b-lg' : null,
]
  .filter(Boolean)
  .join(' ');
