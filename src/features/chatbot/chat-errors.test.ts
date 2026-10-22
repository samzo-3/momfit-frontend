import { ApiError } from '../../shared/api'
import { chatErrorMessage } from './chat-errors'

describe('chatErrorMessage', () => {
  it('네트워크 오류는 연결을 확인하라고 안내한다', () => {
    expect(
      chatErrorMessage(new ApiError(0, 'NETWORK_ERROR', '내부 메시지')),
    ).toBe('네트워크 연결을 확인해 주세요.')
  })

  it('호출 제한은 서버가 준 문구를 그대로 보여준다', () => {
    expect(
      chatErrorMessage(
        new ApiError(
          429,
          'RATE_LIMITED',
          '질문이 너무 빨라요. 잠시 후 다시 시도해 주세요.',
        ),
      ),
    ).toBe('질문이 너무 빨라요. 잠시 후 다시 시도해 주세요.')
  })

  it('온보딩 전과 입력 오류를 각각 안내한다', () => {
    expect(
      chatErrorMessage(new ApiError(403, 'ONBOARDING_REQUIRED', 'x')),
    ).toBe('온보딩을 먼저 마쳐 주세요.')
    expect(chatErrorMessage(new ApiError(422, 'VALIDATION_ERROR', 'x'))).toBe(
      '질문은 1자 이상 500자 이하로 입력해 주세요.',
    )
  })

  it('그 밖의 오류는 서버 내부 사정을 드러내지 않는 문구로 바꾼다', () => {
    const message = '지금은 답변을 만들 수 없어요. 잠시 후 다시 시도해 주세요.'

    expect(
      chatErrorMessage(
        new ApiError(503, 'SERVICE_UNAVAILABLE', 'LLM 내부 오류'),
      ),
    ).toBe(message)
    expect(chatErrorMessage(new ApiError(500, 'UNKNOWN', 'stack trace'))).toBe(
      message,
    )
    expect(chatErrorMessage(new Error('boom'))).toBe(message)
  })
})
