// 카카오 로그인은 서버가 카카오로 보내는 전체 페이지 이동이라, 버튼처럼 보이지만 링크(a)다.
// 같은 도메인의 /api 경로이므로 개발 서버와 운영 모두 프록시를 거친다.
export const KAKAO_LOGIN_PATH = '/api/auth/kakao/login'

function KakaoLoginButton() {
  return (
    <a
      href={KAKAO_LOGIN_PATH}
      className="inline-flex w-full items-center justify-center rounded-full bg-kakao px-6 py-3 text-[17px] font-medium text-black/85 transition-colors hover:brightness-95"
    >
      카카오로 시작하기
    </a>
  )
}

export default KakaoLoginButton
