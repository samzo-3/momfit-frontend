// 카카오 로그인이 실패하면 백엔드가 /login?error=<코드>로 보낸다. (docs/auth-api.md)
const MESSAGES: Record<string, string> = {
  access_denied: '카카오 로그인을 취소하셨어요.',
  state_mismatch: '로그인 요청이 올바르지 않아요. 다시 시도해 주세요.',
  provider_error:
    '카카오 로그인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
}

const FALLBACK = '로그인하지 못했어요. 다시 시도해 주세요.'

// 오류 코드를 사용자에게 보여줄 문구로 바꾼다. 코드가 없으면 null이다.
export function kakaoErrorMessage(code: string | null): string | null {
  if (!code) return null
  return MESSAGES[code] ?? FALLBACK
}
