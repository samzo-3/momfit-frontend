import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import logoImage from '../assets/momfit-logo.png'
import { useAuth } from '../features/auth'
import Button from '../shared/components/Button'
import ButtonLink from '../shared/components/ButtonLink'
import ConfirmDialog from '../shared/components/ConfirmDialog'
import TextLink from '../shared/components/TextLink'

// 로그인했을 때의 메뉴. 지금 보고 있는 화면은 굵게 밑줄로 표시하고 aria-current="page"가 붙는다.
const MEMBER_LINKS = [
  { to: '/home', label: '홈' },
  { to: '/records', label: '운동 기록' },
  { to: '/me', label: '내 정보' },
]

// 관리자는 서비스 이용 화면(홈·운동 기록)과 내 정보(프로필 수정·회원 탈퇴)가 필요 없어 관리자 메뉴만 보인다.
const ADMIN_LINKS = [{ to: '/admin', label: '관리자' }]

// 반투명 상단 내비게이션. 로그인 상태에 따라 오른쪽 버튼이 바뀐다.
function SiteHeader() {
  const { status, user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const isAdmin = user?.role === 'admin'
  const links = isAdmin ? ADMIN_LINKS : MEMBER_LINKS

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
        {/* 로그인한 사용자는 소개 페이지(/)가 아니라 홈으로 돌아온다. */}
        <Link
          to={isAdmin ? '/admin' : isAuthenticated ? '/home' : '/'}
          className="flex items-center"
        >
          {/* 로고 이미지(배경 투명, 457x112). 크기를 미리 알려 로딩 중 레이아웃이 밀리지 않게 한다. */}
          <img
            src={logoImage}
            alt="MomFit"
            width={82}
            height={20}
            className="h-5 w-auto"
          />
        </Link>
        {isAuthenticated && (
          <div className="flex items-center gap-4 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-brand-text hover:underline ${isActive ? 'font-semibold underline underline-offset-4' : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))}
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
