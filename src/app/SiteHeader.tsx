import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth'
import Button from '../shared/components/Button'
import ButtonLink from '../shared/components/ButtonLink'
import ConfirmDialog from '../shared/components/ConfirmDialog'
import TextLink from '../shared/components/TextLink'

// 반투명 상단 내비게이션. 로그인 상태에 따라 오른쪽 버튼이 바뀐다.
function SiteHeader() {
  const { status, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    // 로그아웃하면 랜딩(/)으로 간다. 이동이 화면에 반영된 뒤에 인증 상태를 지운다.
    await logout(() => navigate('/', { replace: true, flushSync: true }))
    setLoggingOut(false)
    setConfirmingLogout(false)
  }

  return (
    <header className="sticky top-0 z-10 border-b border-primary-strong/70 bg-primary-soft/85 backdrop-blur-md">
      <nav
        aria-label="주요"
        className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4"
      >
        <Link
          to="/"
          className="text-[17px] font-semibold tracking-tight text-cocoa"
        >
          momfit
        </Link>
        {isAuthenticated && (
          <div className="flex items-center gap-4 text-sm">
            <TextLink to="/records" tone="brand">
              운동 기록
            </TextLink>
            <TextLink to="/me" tone="brand">
              내 정보
            </TextLink>
            <Button
              variant="brand-outline"
              size="sm"
              onClick={() => setConfirmingLogout(true)}
            >
              로그아웃
            </Button>
          </div>
        )}
        {status === 'unauthenticated' && (
          <div className="flex items-center gap-4 text-sm">
            <TextLink to="/login" tone="brand">
              로그인
            </TextLink>
            <ButtonLink to="/signup" variant="brand" size="sm">
              시작하기
            </ButtonLink>
          </div>
        )}
      </nav>

      <ConfirmDialog
        open={confirmingLogout}
        title="로그아웃하시겠어요?"
        description="이 기기에서 로그아웃합니다."
        confirmLabel={loggingOut ? '로그아웃 중...' : '로그아웃'}
        pending={loggingOut}
        onConfirm={() => void handleLogout()}
        onCancel={() => setConfirmingLogout(false)}
      />
    </header>
  )
}

export default SiteHeader
