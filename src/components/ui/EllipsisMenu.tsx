import { useCallback, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { IconButton } from './IconButton';
import { getEllipsisMenuItemClassName } from './ellipsisMenuStyles';
import { useHotkey } from '../../hooks/useHotkey';
import { useClickOutside } from '../../hooks/useClickOutside';

export interface EllipsisMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  testId?: string;
}

export interface EllipsisMenuTrigger {
  label: string;
  testId?: string;
  icon?: ReactNode;
  variant?: 'ghost' | 'rounded';
  className?: string;
  style?: CSSProperties;
}

export interface EllipsisMenuConfig {
  testId?: string;
  className?: string;
  offsetClassName?: string;
  ariaLabel?: string;
  align?: 'left' | 'right';
}

interface EllipsisMenuItemsProps {
  items: EllipsisMenuItem[];
  menuContent?: never;
}

interface EllipsisMenuContentProps {
  items?: never;
  menuContent: (helpers: { closeMenu: () => void }) => ReactNode;
}

type EllipsisMenuProps = {
  trigger: EllipsisMenuTrigger;
  menu?: EllipsisMenuConfig;
  onOpenChange?: (open: boolean) => void;
  stopPropagation?: boolean;
} & (EllipsisMenuItemsProps | EllipsisMenuContentProps);

export const EllipsisMenu = ({
  trigger,
  menu,
  items,
  menuContent,
  onOpenChange,
  stopPropagation = false,
}: EllipsisMenuProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const normalizedTrigger = {
    label: trigger.label,
    testId: trigger.testId,
    icon: trigger.icon,
    variant: trigger.variant ?? 'ghost',
    className: trigger.className ?? '',
    style: trigger.style,
  };

  const normalizedMenu = {
    testId: menu?.testId,
    className: menu?.className ?? 'min-w-60',
    offsetClassName: menu?.offsetClassName,
    ariaLabel: menu?.ariaLabel,
    align: menu?.align ?? 'right',
  };

  const setMenuOpen = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }, [onOpenChange]);

  useHotkey('escape', () => {
    setMenuOpen(false);
  }, { enabled: open, capture: true, preventDefault: true });

  useClickOutside(rootRef, () => setMenuOpen(false), { enabled: open });

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

  const menuItems = items?.map((item, index) => {
    const isLast = index === items.length - 1;
    const className = getEllipsisMenuItemClassName({
      tone: item.variant === 'danger' ? 'danger' : 'default',
      disabled: item.disabled,
      isFirst: index === 0,
      isLast,
    });

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
          setMenuOpen(false);
        }}
      >
        {item.icon}
        {item.label}
      </button>
    );
  });

  const triggerVariantClassName = normalizedTrigger.variant === 'rounded'
    ? '!h-10 !w-10 !aspect-square !shrink-0 !rounded-full !border-transparent !bg-cyan-300/15 !p-0 !text-cyan-100 hover:!border-cyan-300/35 hover:!bg-cyan-300/25'
    : '!border-transparent !bg-transparent !p-1.5 !text-slate-300 hover:!bg-transparent hover:!text-slate-100';
  const triggerOpenClassName = normalizedTrigger.variant === 'rounded'
    ? 'text-cyan-100'
    : '!border-cyan-300/45 !text-cyan-100';
  const menuOffsetClassName = normalizedMenu.offsetClassName ?? (normalizedTrigger.variant === 'rounded' ? 'top-11' : 'top-10');
  const menuAlignClassName = normalizedMenu.align === 'left' ? 'left-0' : 'right-0';

  return (
    <div
      ref={rootRef}
      className="relative flex items-center"
      onMouseDown={onContainerMouseDown}
      onClick={onContainerClick}
    >
      <IconButton
        label={normalizedTrigger.label}
        variant="neutral"
        size="sm"
        data-testid={normalizedTrigger.testId}
        aria-haspopup="menu"
        aria-expanded={open}
        style={normalizedTrigger.style}
        className={[
          triggerVariantClassName,
          open ? triggerOpenClassName : null,
          normalizedTrigger.className,
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={(event) => {
          if (stopPropagation) {
            event.stopPropagation();
          }
          setMenuOpen(!open);
        }}
      >
        {normalizedTrigger.icon ?? (
          <svg width="20" height="20" fill="none" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="4" r="1.5" fill="currentColor" />
            <circle cx="10" cy="10" r="1.5" fill="currentColor" />
            <circle cx="10" cy="16" r="1.5" fill="currentColor" />
          </svg>
        )}
      </IconButton>

      {open && (
        <div
          className={`absolute ${menuAlignClassName} ${menuOffsetClassName} z-50 max-h-[min(70vh,24rem)] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/95 py-2 shadow-xl ${normalizedMenu.className}`.trim()}
          data-testid={normalizedMenu.testId}
          role="menu"
          aria-label={normalizedMenu.ariaLabel ?? normalizedTrigger.label}
        >
          {menuContent ? menuContent({ closeMenu: () => setMenuOpen(false) }) : menuItems}
        </div>
      )}
    </div>
  );
};
