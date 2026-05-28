import { forwardRef, type InputHTMLAttributes } from 'react';

const baseClassName =
  'w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition placeholder:text-slate-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', type = 'text', ...props },
  ref
) {
  const classes = [baseClassName, className].filter(Boolean).join(' ');

  return <input ref={ref} type={type} className={classes} {...props} />;
});

Input.displayName = 'Input';
