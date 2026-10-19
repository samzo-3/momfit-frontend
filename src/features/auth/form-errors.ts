import { ApiError } from '../../shared/api'

export const GENERIC_ERROR_MESSAGE =
  '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE
}

// 서버가 내려준 필드명(snake_case)을 폼 필드명으로 바꾼다.
const SERVER_FIELD_NAMES: Record<string, string> = {
  login_id: 'loginId',
  due_date: 'dueDate',
  exercise_level: 'exerciseLevel',
  new_password: 'newPassword',
  'consents.terms': 'consents',
  'consents.health_data': 'consents',
}

export function serverFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.fields) return {}
  const result: Record<string, string> = {}
  for (const [name, message] of Object.entries(error.fields)) {
    result[SERVER_FIELD_NAMES[name] ?? name] = message
  }
  return result
}
