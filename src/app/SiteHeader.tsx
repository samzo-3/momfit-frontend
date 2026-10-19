import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth'
import Button from '../shared/components/Button'
import ButtonLink from '../shared/components/ButtonLink'
import TextLink from '../shared/components/TextLink'

// 반투명 상단 내비게이션. 로그인 상태에 따라 오른쪽 버튼이 바뀐다.
function SiteHeader() {
  const { status, isAuthenticated, logout } = useAuth()

  return (
    <header className="sticky top-0 z-10 border-b border-line/60 bg-white/80 backdrop-blur-md">
      <nav
        aria-label="주요"
        className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4"
      >
        <Link to="/" className="text-[17px] font-semibold tracking-tight">
          MomFit
        </Link>
        {isAuthenticated && (
          <Button variant="secondary" size="sm" onClick={() => void logout()}>
            로그아웃
          </Button>
        )}
        {status === 'unauthenticated' && (
          <div className="flex items-center gap-4 text-sm">
            <TextLink to="/login">로그인</TextLink>
            <ButtonLink to="/signup" size="sm">
              시작하기
            </ButtonLink>
          </div>
        )}
      </nav>
    </header>
  )
}

export default SiteHeader
