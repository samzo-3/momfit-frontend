import { kakaoErrorMessage } from './kakao-errors'

describe('kakaoErrorMessage', () => {
  it.each([
    ['access_denied', '카카오 로그인을 취소하셨어요.'],
    ['state_mismatch', '로그인 요청이 올바르지 않아요. 다시 시도해 주세요.'],
    [
      'provider_error',
      '카카오 로그인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
    ],
  ])('%s 코드는 사용자용 문구로 바꾼다', (code, message) => {
    expect(kakaoErrorMessage(code)).toBe(message)
  })

  it('알 수 없는 코드는 일반 안내를 보여준다', () => {
    expect(kakaoErrorMessage('something_new')).toBe(
      '로그인하지 못했어요. 다시 시도해 주세요.',
    )
  })

  it('코드가 없으면 아무것도 보여주지 않는다', () => {
    expect(kakaoErrorMessage(null)).toBeNull()
    expect(kakaoErrorMessage('')).toBeNull()
  })

  it('서버가 준 코드를 문구에 그대로 노출하지 않는다', () => {
    expect(kakaoErrorMessage('<script>alert(1)</script>')).not.toContain(
      'script',
    )
  })
})
