import { isSafeUrl, jurisdictionLabel, splitDisclaimer } from './answer-format'

describe('splitDisclaimer', () => {
  it('끝의 면책 문구를 본문과 나눈다', () => {
    expect(
      splitDisclaimer('본문입니다.\n\n※ 일반 정보이며 의료 조언이 아닙니다.'),
    ).toEqual({
      body: '본문입니다.',
      note: '※ 일반 정보이며 의료 조언이 아닙니다.',
    })
  })

  it('면책 문구가 없으면 note는 null이다', () => {
    expect(splitDisclaimer('본문만 있어요.')).toEqual({
      body: '본문만 있어요.',
      note: null,
    })
  })

  it('본문 안의 ※가 아니라 마지막 ※부터 면책 문구로 본다', () => {
    const result = splitDisclaimer('※ 표시가 있는 본문\n\n※ 면책')

    expect(result.body).toBe('※ 표시가 있는 본문')
    expect(result.note).toBe('※ 면책')
  })
})

describe('jurisdictionLabel', () => {
  it('나라 코드를 한국어로 바꾸고 모르는 코드는 그대로 둔다', () => {
    expect(jurisdictionLabel('KR')).toBe('한국')
    expect(jurisdictionLabel('US')).toBe('미국')
    expect(jurisdictionLabel('UK')).toBe('영국')
    expect(jurisdictionLabel('INTL')).toBe('국제')
    expect(jurisdictionLabel('XX')).toBe('XX')
  })
})

describe('isSafeUrl', () => {
  it('https 주소만 안전하다고 본다', () => {
    expect(isSafeUrl('https://www.nhs.uk/pregnancy')).toBe(true)
    expect(isSafeUrl('http://example.com')).toBe(false)
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeUrl('')).toBe(false)
  })
})
