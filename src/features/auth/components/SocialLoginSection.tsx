import KakaoLoginButton from './KakaoLoginButton'

// 아이디로 진행하는 폼 아래에 두는 카카오 로그인. 위쪽 "또는" 구분선으로 폼과 나눈다.
function SocialLoginSection() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-sm text-ink-secondary">
        <hr className="flex-1 border-line" />
        <span>또는</span>
        <hr className="flex-1 border-line" />
      </div>
      <KakaoLoginButton />
    </div>
  )
}

export default SocialLoginSection
