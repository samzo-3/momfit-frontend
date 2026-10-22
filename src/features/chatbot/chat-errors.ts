import { ApiError } from '../../shared/api'

const FALLBACK = '지금은 답변을 만들 수 없어요. 잠시 후 다시 시도해 주세요.'

// 요청이 실패했을 때 말풍선에 보여줄 안내. 서버 내부 사정은 드러내지 않는다.
export function chatErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return FALLBACK

  switch (error.code) {
    case 'NETWORK_ERROR':
      return '네트워크 연결을 확인해 주세요.'
    case 'RATE_LIMITED':
      // 서버가 "분당"인지 "오늘"인지에 맞는 문구를 준다.
      return error.message
    case 'ONBOARDING_REQUIRED':
      return '온보딩을 먼저 마쳐 주세요.'
    case 'VALIDATION_ERROR':
      return '질문은 1자 이상 500자 이하로 입력해 주세요.'
    default:
      return FALLBACK
  }
}
