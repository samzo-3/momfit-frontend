import { Link, type LinkProps } from 'react-router-dom'

function TextLink({ className, ...props }: LinkProps) {
  return (
    <Link
      {...props}
      className={`text-link hover:underline ${className ?? ''}`}
    />
  )
}

export default TextLink
