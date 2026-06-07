import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { IconButton } from './IconButton';
import { useHotkey } from '../../hooks/useHotkey';

export interface EllipsisMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  testId?: string;
}

interface EllipsisMenuProps {
  triggerLabel: string;
  triggerTestId?: string;
  triggerVariant?: 'ghost' | 'rounded';
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
  menuTestId?: string;
  menuClassName?: string;
  menuAriaLabel?: string;
  items: EllipsisMenuItem[];
  stopPropagation?: boolean;
}

export const EllipsisMenu = ({
  triggerLabel,
  triggerTestId,
  triggerVariant = 'ghost',
  triggerClassName = '',
  triggerStyle,
  menuTestId,
  menuClassName = 'min-w-60',
  menuAriaLabel,
  items,
  stopPropagation = false,
}: EllipsisMenuProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useHotkey('escape', () => {
    setOpen(false);
  }, { enabled: open });

  useEffect(() => {
    if (!open) return;

    const handleOutsidePointer = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsidePointer);

    return () => {
      document.removeEventListener('mousedown', handleOutsidePointer);
    };
  }, [open]);

  const onContainerMouseDown = (event: ReactMouseEvent) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
  };

  const onContainerClick = (event: ReactMouseEvent) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
  };

  const menuItems = useMemo(
    () =>
      items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isDanger = item.variant === 'danger';

        const className = [
          'flex w-full items-center gap-3 px-4 py-2 text-left text-sm whitespace-nowrap focus:outline-none',
          isDanger
            ? 'text-rose-200 hover:bg-rose-500/20 focus:bg-rose-500/20'
            : 'text-slate-100 hover:bg-cyan-900/40 focus:bg-cyan-900/40',
          item.disabled ? 'cursor-not-allowed opacity-50' : null,
          isLast ? 'rounded-b-lg' : null,
          index === 0 ? 'rounded-t-lg' : null,
        ].join(' ');

        return (
          <button
            key={item.id}
            type="button"
            className={className}
            disabled={item.disabled}
            data-testid={item.testId}
            role="menuitem"
            onClick={(event) => {
              if (stopPropagation) {
                event.stopPropagation();
              }
              item.onSelect();
              setOpen(false);
            }}
          >
            {item.icon}
            {item.label}
          </button>
        );
      }),
    [items, stopPropagation]
  );

  const triggerVariantClassName = triggerVariant === 'rounded'
    ? '!h-10 !w-10 !aspect-square !shrink-0 !rounded-full !border-transparent !bg-cyan-300/15 !p-0 !text-cyan-100 hover:!border-cyan-300/35 hover:!bg-cyan-300/25'
    : '!border-transparent !bg-transparent !p-1.5 !text-slate-300 hover:!bg-transparent hover:!text-slate-100';
  const triggerOpenClassName = triggerVariant === 'rounded'
    ? 'text-cyan-100'
    : '!border-cyan-300/45 !text-cyan-100';
  const menuOffsetClassName = triggerVariant === 'rounded' ? 'top-11' : 'top-10';

  return (
    <div
      ref={rootRef}
      className="relative flex items-center"
      onMouseDown={onContainerMouseDown}
      onClick={onContainerClick}
    >
      <IconButton
        label={triggerLabel}
        variant="neutral"
        size="sm"
        data-testid={triggerTestId}
        aria-haspopup="menu"
        aria-expanded={open}
        style={triggerStyle}
        className={[
          triggerVariantClassName,
          open ? triggerOpenClassName : null,
          triggerClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={(event) => {
          if (stopPropagation) {
            event.stopPropagation();
          }
          setOpen((prev) => !prev);
        }}
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="4" r="1.5" fill="currentColor" />
          <circle cx="10" cy="10" r="1.5" fill="currentColor" />
          <circle cx="10" cy="16" r="1.5" fill="currentColor" />
        </svg>
      </IconButton>

      {open && (
        <div
          className={`absolute right-0 ${menuOffsetClassName} z-50 max-h-[min(70vh,24rem)] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/95 py-2 shadow-xl ${menuClassName}`.trim()}
          data-testid={menuTestId}
          role="menu"
          aria-label={menuAriaLabel ?? triggerLabel}
        >
          {menuItems}
        </div>
      )}
    </div>
  );
};
