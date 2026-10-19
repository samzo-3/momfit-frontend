import {
  dueDateRange,
  validateDueDate,
  validateEmail,
  validateLoginId,
  validateNickname,
  validatePassword,
} from './validation'

describe('validateLoginId', () => {
  it.each(['abcd', 'momfit01', 'a1b2c3d4e5f6g7h8i9j0'])(
    '%s는 통과한다',
    (v) => {
      expect(validateLoginId(v)).toBeNull()
    },
  )

  it.each(['abc', 'a'.repeat(21), 'UPPER01', 'has space', 'han글01', ''])(
    '%j는 거절한다',
    (v) => {
      expect(validateLoginId(v)).not.toBeNull()
    },
  )
})

describe('validatePassword', () => {
  it('8자 이상 영문+숫자는 통과한다', () => {
    expect(validatePassword('password1')).toBeNull()
  })

  it.each(['short1', 'onlyletters', '12345678', ''])('%j는 거절한다', (v) => {
    expect(validatePassword(v)).not.toBeNull()
  })

  it('128자를 넘으면 거절한다', () => {
    expect(validatePassword('a1'.repeat(65))).not.toBeNull()
  })
})

describe('validateNickname / validateEmail', () => {
  it('닉네임은 공백을 뺀 1~20자', () => {
    expect(validateNickname('맘핏')).toBeNull()
    expect(validateNickname('   ')).not.toBeNull()
    expect(validateNickname('가'.repeat(21))).not.toBeNull()
  })

  it('이메일 형식을 검사한다', () => {
    expect(validateEmail(' a@b.com ')).toBeNull()
    expect(validateEmail('a@b')).not.toBeNull()
    expect(validateEmail('ab.com')).not.toBeNull()
  })
})

describe('출산 예정일', () => {
  const today = new Date(2026, 9, 19) // 2026-10-19 (로컬)

  it('범위는 오늘부터 280일 뒤까지다', () => {
    expect(dueDateRange(today)).toEqual({
      min: '2026-10-19',
      max: '2027-07-26',
    })
  })

  it('경계값을 허용하고 범위 밖은 거절한다', () => {
    expect(validateDueDate('2026-10-19', today)).toBeNull()
    expect(validateDueDate('2027-07-26', today)).toBeNull()
    expect(validateDueDate('2026-10-18', today)).not.toBeNull()
    expect(validateDueDate('2027-07-27', today)).not.toBeNull()
    expect(validateDueDate('', today)).not.toBeNull()
  })
})
