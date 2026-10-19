// 백엔드 검증 규칙과 맞춘 입력 검사 (docs/auth-api.md). 서버가 최종 판단하고, 여기서는 빠른 안내용이다.

const LOGIN_ID_PATTERN = /^[a-z0-9]{4,20}$/
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const PREGNANCY_DAYS = 280

export function validateLoginId(value: string): string | null {
  return LOGIN_ID_PATTERN.test(value)
    ? null
    : '영문 소문자와 숫자 4~20자로 입력해 주세요.'
}

export function validatePassword(value: string): string | null {
  if (value.length > 128) return '128자 이하로 입력해 주세요.'
  if (value.length < 8 || !/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return '8자 이상, 영문과 숫자를 포함해 주세요.'
  }
  return null
}

export function validateNickname(value: string): string | null {
  const length = value.trim().length
  return length >= 1 && length <= 20 ? null : '닉네임은 1~20자로 입력해 주세요.'
}

export function validateEmail(value: string): string | null {
  return EMAIL_PATTERN.test(value.trim())
    ? null
    : '이메일 형식이 올바르지 않습니다.'
}

export function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// 출산 예정일로 고를 수 있는 범위: 오늘부터 280일 이내
export function dueDateRange(today = new Date()): { min: string; max: string } {
  const max = new Date(today)
  max.setDate(max.getDate() + PREGNANCY_DAYS)
  return { min: toDateInputValue(today), max: toDateInputValue(max) }
}

export function validateDueDate(
  value: string,
  today = new Date(),
): string | null {
  if (!value) return '출산 예정일을 입력해 주세요.'
  const { min, max } = dueDateRange(today)
  // YYYY-MM-DD 문자열은 사전순 비교가 날짜순과 같다.
  return value >= min && value <= max
    ? null
    : '출산 예정일은 오늘부터 280일 이내여야 합니다.'
}
