import { Link, type LinkProps } from 'react-router-dom'

interface TextLinkProps extends LinkProps {
  // brand: 살구색 화면의 링크 색(brand-text). 기본은 파란 링크.
  tone?: 'default' | 'brand'
}

function TextLink({ className, tone = 'default', ...props }: TextLinkProps) {
  return (
    <Link
      {...props}
      className={`${tone === 'brand' ? 'text-brand-text' : 'text-link'} hover:underline ${className ?? ''}`}
    />
  )
}

export default TextLink
