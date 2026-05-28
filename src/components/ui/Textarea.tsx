import { forwardRef, type TextareaHTMLAttributes } from 'react';

const baseClassName =
  'w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-300 transition placeholder:text-slate-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = '', ...props },
  ref
) {
  const classes = [baseClassName, className].filter(Boolean).join(' ');

  return <textarea ref={ref} className={classes} {...props} />;
});

Textarea.displayName = 'Textarea';
