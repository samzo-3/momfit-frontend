import { useId, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id'
> {
  label: string
  error?: string | null
  hint?: string
}

function TextField({
  label,
  error,
  hint,
  className,
  ...inputProps
}: TextFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy =
    [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        {...inputProps}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`rounded-xl border bg-white px-4 py-3 text-[17px] placeholder:text-ink-secondary/60 disabled:bg-surface disabled:text-ink-secondary ${error ? 'border-danger' : 'border-line'} ${className ?? ''}`}
      />
      {hint && (
        <p id={hintId} className="text-xs text-ink-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export default TextField
