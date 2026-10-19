import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary'
type Size = 'md' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover disabled:bg-accent/40 border border-transparent',
  secondary:
    'border border-accent text-accent bg-transparent hover:bg-accent/5 disabled:border-line disabled:text-ink-secondary/60 disabled:hover:bg-transparent',
}

const SIZES: Record<Size, string> = {
  md: 'px-6 py-3 text-[17px]',
  sm: 'px-4 py-1.5 text-sm',
}

// 알약형 버튼. 폼 안에서 실수로 제출되지 않도록 type 기본값은 button이다.
function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      {...props}
      className={`rounded-full font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className ?? ''}`}
    />
  )
}

export default Button
