const KST_DATE_TIME = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const KST_DATE = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

// 서버의 UTC 시각(ISO 8601)을 기기 시간대와 상관없이 한국 시간으로 보여 준다. 예: "2026. 10. 22. 14:05"
export function formatKstDateTime(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : KST_DATE_TIME.format(date)
}

export function formatKstDate(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : KST_DATE.format(date)
}

// "2026-10-22"처럼 날짜만 있는 값
export function formatPlainDate(value: string | null): string {
  if (!value) return '-'
  const [year, month, day] = value.split('-').map(Number)
  return year && month && day ? `${year}. ${month}. ${day}.` : value
}

export const ACTION_LABELS = {
  view_member: '회원 정보 조회',
  withdraw_member: '강제 탈퇴',
  restore_member: '복구',
} as const

export const LEVEL_LABELS = {
  low: '낮음',
  medium: '보통',
  high: '높음',
} as const

export const PROVIDER_LABELS = { local: '아이디', kakao: '카카오' } as const

export const STATUS_LABELS = {
  active: '이용 중',
  withdrawn: '탈퇴 유예',
} as const
