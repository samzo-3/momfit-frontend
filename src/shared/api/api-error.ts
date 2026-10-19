export type ApiFieldErrors = Record<string, string>

// 백엔드 공통 에러 형식: { error: { code, message, fields? } } (docs/auth-api.md)
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: ApiFieldErrors

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: ApiFieldErrors,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; fields?: ApiFieldErrors }
}

export async function toApiError(response: Response): Promise<ApiError> {
  let body: ErrorBody | null = null
  try {
    body = (await response.json()) as ErrorBody
  } catch {
    // JSON이 아닌 응답(프록시 오류 페이지 등)은 상태 코드만으로 처리한다.
  }
  const error = body?.error
  return new ApiError(
    response.status,
    error?.code ?? 'UNKNOWN',
    error?.message ?? (response.statusText || '요청에 실패했습니다.'),
    error?.fields,
  )
}
