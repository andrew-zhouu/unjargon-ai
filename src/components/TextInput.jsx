import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const TextInput = forwardRef(function TextInput(
  { value, onChange, onKeyDown, rows = 8, className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      aria-label="Text to unjargon"
      className={cn(
        "block w-full resize-y bg-transparent px-5 pt-5 pb-3 text-[1.0625rem] leading-relaxed text-text",
        "placeholder:text-text-muted focus:outline-none",
        className
      )}
      placeholder="Paste complicated text here…"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      rows={rows}
      {...props}
    />
  );
});

export default TextInput;
