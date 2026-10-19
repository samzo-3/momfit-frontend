import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth'
import Button from '../shared/components/Button'

// 반투명 상단 내비게이션. 로그인했을 때만 로그아웃을 보여준다.
function SiteHeader() {
  const { isAuthenticated, logout } = useAuth()

  return (
    <header className="sticky top-0 z-10 border-b border-line/60 bg-white/80 backdrop-blur-md">
      <nav
        aria-label="주요"
        className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4"
      >
        <Link to="/" className="text-[17px] font-semibold tracking-tight">
          맘핏
        </Link>
        {isAuthenticated && (
          <Button variant="secondary" size="sm" onClick={() => void logout()}>
            로그아웃
          </Button>
        )}
      </nav>
    </header>
  )
}

export default SiteHeader
