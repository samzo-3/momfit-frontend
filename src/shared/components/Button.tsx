import type { ComponentProps } from 'react'
import {
  buttonClass,
  type ButtonSize,
  type ButtonVariant,
} from './button-styles'

// ComponentProps는 React 19에서 ref도 일반 prop으로 포함한다.
interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
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
      className={buttonClass(variant, size, fullWidth, className)}
    />
  )
}

export default Button
