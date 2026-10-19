export type ButtonVariant = 'primary' | 'secondary'
export type ButtonSize = 'md' | 'sm' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover disabled:bg-accent/40 border border-transparent',
  secondary:
    'border border-accent text-accent bg-transparent hover:bg-accent/5 disabled:border-line disabled:text-ink-secondary/60 disabled:hover:bg-transparent',
}

const SIZES: Record<ButtonSize, string> = {
  lg: 'px-8 py-3.5 text-[19px]',
  md: 'px-6 py-3 text-[17px]',
  sm: 'px-4 py-1.5 text-sm',
}

// Button과 ButtonLink가 같은 알약형 모양을 쓰도록 클래스를 한곳에서 만든다.
export function buttonClass(
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth = false,
  extra = '',
): string {
  return `inline-flex items-center justify-center rounded-full font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${extra}`
}
