import type { ButtonHTMLAttributes, ReactNode } from 'react';

const baseClassName =
  'inline-flex items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-60';

const variantClassNames = {
  primary: 'bg-cyan-400 text-slate-900 hover:bg-cyan-300',
  secondary: 'border border-cyan-300/40 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20',
  ghost: 'border border-white/20 bg-white/5 text-slate-200 hover:bg-white/10',
  danger: 'border border-rose-300/40 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20',
  icon: 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
  link: 'text-cyan-200 underline decoration-cyan-200/70 underline-offset-4 hover:text-cyan-100',
} as const;

const sizeClassNames = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm font-semibold',
  lg: 'px-4 py-2 font-semibold',
  icon: 'p-1',
  iconSm: 'p-1.5',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClassNames;
  size?: keyof typeof sizeClassNames;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  startIcon,
  endIcon,
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) => {
  const classes = [baseClassName, variantClassNames[variant], sizeClassNames[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...props}>
      {startIcon}
      {children}
      {endIcon}
    </button>
  );
};
