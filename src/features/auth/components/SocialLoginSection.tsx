import KakaoLoginButton from './KakaoLoginButton'

// 카카오 로그인 버튼과, 아이디로 진행하는 입력 폼을 구분하는 줄.
function SocialLoginSection() {
  return (
    <div className="flex flex-col gap-4">
      <KakaoLoginButton />
      <div className="flex items-center gap-3 text-sm text-ink-secondary">
        <hr className="flex-1 border-line" />
        <span>또는</span>
        <hr className="flex-1 border-line" />
      </div>
    </div>
  )
}

export default SocialLoginSection
