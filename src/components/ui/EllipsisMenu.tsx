import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { Button } from './Button';
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
  triggerClassName = '',
  triggerStyle,
  menuTestId,
  menuClassName = 'min-w-40',
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
          'flex w-full items-center justify-start gap-2 rounded-none border-x-0 px-3 py-2 text-left text-sm font-normal whitespace-nowrap',
          isLast ? 'border-b-0 border-t' : 'border-b border-t-0',
          isDanger
            ? 'border-rose-400/10 text-rose-200 hover:bg-rose-400/10'
            : 'text-slate-100 hover:bg-cyan-400/10',
        ].join(' ');

        return (
          <Button
            key={item.id}
            type="button"
            variant="ghost"
            size="sm"
            className={className}
            startIcon={item.icon}
            disabled={item.disabled}
            data-testid={item.testId} role="menuitem"
            onClick={(event) => {
              if (stopPropagation) {
                event.stopPropagation();
              }
              item.onSelect();
              setOpen(false);
            }}
          >
            {item.label}
          </Button>
        );
      }),
    [items, stopPropagation]
  );

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
          'border-white/20 bg-white/5 text-slate-200 hover:bg-white/10',
          open ? 'text-cyan-100' : null,
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
          className={`absolute right-0 top-10 z-50 rounded-lg border border-white/10 bg-slate-900 shadow-lg ${menuClassName}`.trim()}
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
