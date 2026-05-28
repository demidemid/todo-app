import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

const variantClassNames = {
  neutral: 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
  primary: 'text-cyan-200/85 hover:border-cyan-300/35 hover:bg-cyan-300/[0.12] hover:text-cyan-100',
  danger: 'text-rose-200/80 hover:border-rose-300/35 hover:bg-rose-400/[0.12] hover:text-rose-100',
} as const;

const sizeClassNames = {
  sm: 'p-1.5',
  md: 'p-1.5',
  lg: 'p-2',
} as const;

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClassNames;
  size?: keyof typeof sizeClassNames;
  label: string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    variant = 'neutral',
    size = 'md',
    label,
    children,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const { title: providedTitle, ...restProps } = props;
  const classes = [
    'inline-flex items-center justify-center rounded-md border border-transparent transition focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40',
    variantClassNames[variant],
    sizeClassNames[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} type={type} className={classes} aria-label={label} title={providedTitle ?? label} {...restProps}>
      {children}
    </button>
  );
});

IconButton.displayName = 'IconButton';
