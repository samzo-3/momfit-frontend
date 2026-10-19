import { Link, type LinkProps } from 'react-router-dom'
import {
  buttonClass,
  type ButtonSize,
  type ButtonVariant,
} from './button-styles'

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
}

// 이동은 링크로, 모양은 버튼으로. 화면 이동에는 button이 아니라 이 컴포넌트를 쓴다.
function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link {...props} className={buttonClass(variant, size, false, className)} />
  )
}

export default ButtonLink
