import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  errorResponse,
  jsonResponse,
  mockApi,
  requestsTo,
  resetAuthStore,
  signIn,
  userBody,
} from '../../../test/auth-test-utils'
import { renderApp } from '../../../test/render-app'
import { setupAuth } from '../auth-session'
import { useAuthStore } from '../store/auth-store'
import { dueDateRange } from '../validation'

const fetchMock = vi.fn<typeof fetch>()
const PATCH = 'PATCH /api/users/me'
const FUTURE_DUE = dueDateRange().max

function bodyOf(callIndex = 0) {
  const calls = requestsTo(fetchMock, PATCH)
  return JSON.parse(String(calls[callIndex][1]?.body))
}

const save = () => screen.getByRole('button', { name: '저장' })
const editButton = () => screen.getByRole('button', { name: '수정하기' })

async function startEditing() {
  const user = userEvent.setup()
  await user.click(editButton())
  return user
}

async function changeNickname(
  user: ReturnType<typeof userEvent.setup>,
  value: string,
) {
  const field = screen.getByLabelText('닉네임')
  await user.clear(field)
  await user.type(field, value)
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  resetAuthStore()
  setupAuth()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('내 정보 - 조회', () => {
  it('처음에는 수정 폼 없이 내 정보를 읽기 전용으로 보여준다', () => {
    signIn({
      nickname: '테스트맘',
      exerciseLevel: 'medium',
      pregnancyWeek: 28,
      dueDate: '2027-01-11',
    })
    renderApp('/me')

    const info = within(screen.getByText('아이디').closest('dl')!)
    expect(info.getByText('momfit01')).toBeInTheDocument()
    expect(info.getByText('mom@example.com')).toBeInTheDocument()
    expect(info.getByText('테스트맘')).toBeInTheDocument()
    expect(info.getByText('2027년 1월 11일')).toBeInTheDocument()
    expect(info.getByText('28주차')).toBeInTheDocument()
    expect(info.getByText('중')).toBeInTheDocument()

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('출산 예정일')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(editButton()).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '저장' }),
    ).not.toBeInTheDocument()
  })

  it('회원 탈퇴는 조회 화면에 있다', () => {
    signIn()
    renderApp('/me')

    expect(
      screen.getByRole('button', { name: '회원 탈퇴' }),
    ).toBeInTheDocument()
  })

  it('값이 없는 항목은 -로 보여준다', () => {
    signIn({ dueDate: null, pregnancyWeek: null, exerciseLevel: null })
    renderApp('/me')

    const info = within(screen.getByText('아이디').closest('dl')!)
    expect(info.getAllByText('-')).toHaveLength(2)
    expect(info.queryByText('임신 주차')).not.toBeInTheDocument()
  })

  it('카카오 계정은 아이디와 이메일 대신 로그인 방식을 보여준다', () => {
    signIn({ provider: 'kakao', loginId: null, email: null })
    renderApp('/me')

    const info = within(screen.getByText('로그인 방식').closest('dl')!)
    expect(info.getByText('카카오')).toBeInTheDocument()
    expect(info.queryByText('아이디')).not.toBeInTheDocument()
    expect(info.queryByText('이메일')).not.toBeInTheDocument()
  })
})

describe('내 정보 - 수정', () => {
  it('수정하기를 누르면 현재 값이 채워진 폼이 열리고 닉네임에 포커스가 간다', async () => {
    signIn({ nickname: '테스트맘', exerciseLevel: 'medium' })
    renderApp('/me')

    await startEditing()

    expect(screen.getByLabelText('닉네임')).toHaveValue('테스트맘')
    expect(screen.getByLabelText('닉네임')).toHaveFocus()
    expect(screen.getByLabelText('출산 예정일')).toHaveValue('2027-01-11')
    expect(screen.getByRole('radio', { name: '중' })).toBeChecked()
    expect(
      screen.queryByRole('button', { name: '수정하기' }),
    ).not.toBeInTheDocument()
  })

  it('닉네임 입력칸에 예시 문구가 있고, 비우면 그 문구가 보인다', async () => {
    signIn({ nickname: '테스트맘' })
    renderApp('/me')
    const user = await startEditing()

    const field = screen.getByLabelText('닉네임')
    expect(field).toHaveAttribute('placeholder', '1~20자 (공백만은 불가)')
    await user.clear(field)

    expect(field).toHaveValue('')
    expect(screen.getByPlaceholderText('1~20자 (공백만은 불가)')).toBe(field)
  })

  it('수정 중에는 회원 탈퇴 영역을 숨긴다', async () => {
    signIn()
    renderApp('/me')

    await startEditing()

    expect(
      screen.queryByRole('button', { name: '회원 탈퇴' }),
    ).not.toBeInTheDocument()
  })

  it('바꾼 내용이 없으면 저장할 수 없다', async () => {
    signIn()
    renderApp('/me')

    await startEditing()

    expect(save()).toBeDisabled()
  })

  it('아이디와 이메일은 수정할 수 없다', async () => {
    signIn()
    renderApp('/me')

    await startEditing()

    expect(screen.queryByLabelText('아이디')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('이메일')).not.toBeInTheDocument()
  })

  it('닉네임만 바꿔 저장하면 닉네임만 보내고, 조회 화면으로 돌아와 새 값과 안내를 보여준다', async () => {
    signIn()
    mockApi(fetchMock, {
      [PATCH]: () => jsonResponse(200, { ...userBody, nickname: '새닉네임' }),
    })
    renderApp('/me')
    const user = await startEditing()

    await changeNickname(user, '새닉네임')
    await user.click(save())

    expect(await screen.findByText('저장되었습니다.')).toBeInTheDocument()
    expect(bodyOf()).toEqual({ nickname: '새닉네임' })
    expect(useAuthStore.getState().user?.nickname).toBe('새닉네임')
    expect(screen.queryByLabelText('닉네임')).not.toBeInTheDocument()
    const info = within(screen.getByText('아이디').closest('dl')!)
    expect(info.getByText('새닉네임')).toBeInTheDocument()
    expect(editButton()).toHaveFocus()
  })

  it('여러 항목을 바꾸면 바뀐 항목만 snake_case로 보낸다', async () => {
    signIn({ exerciseLevel: 'low' })
    mockApi(fetchMock, {
      [PATCH]: () =>
        jsonResponse(200, {
          ...userBody,
          due_date: FUTURE_DUE,
          exercise_level: 'high',
        }),
    })
    renderApp('/me')
    const user = await startEditing()

    await user.clear(screen.getByLabelText('출산 예정일'))
    await user.type(screen.getByLabelText('출산 예정일'), FUTURE_DUE)
    await user.click(screen.getByRole('radio', { name: '상' }))
    await user.click(save())

    await screen.findByText('저장되었습니다.')
    expect(bodyOf()).toEqual({ due_date: FUTURE_DUE, exercise_level: 'high' })
    expect(
      within(screen.getByText('아이디').closest('dl')!).getByText('상'),
    ).toBeInTheDocument()
  })

  it('다시 수정하기를 누르면 저장 완료 안내를 지운다', async () => {
    signIn()
    mockApi(fetchMock, {
      [PATCH]: () => jsonResponse(200, { ...userBody, nickname: '가나다' }),
    })
    renderApp('/me')
    const user = await startEditing()
    await changeNickname(user, '가나다')
    await user.click(save())
    await screen.findByText('저장되었습니다.')

    await user.click(editButton())

    expect(screen.queryByText('저장되었습니다.')).not.toBeInTheDocument()
  })
})

describe('내 정보 - 수정 취소', () => {
  it('취소하면 요청 없이 조회 화면으로 돌아가고 수정하기에 포커스를 준다', async () => {
    signIn({ nickname: '테스트맘' })
    renderApp('/me')
    const user = await startEditing()

    await changeNickname(user, '바꾸는 중')
    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(requestsTo(fetchMock, PATCH)).toHaveLength(0)
    expect(screen.queryByLabelText('닉네임')).not.toBeInTheDocument()
    expect(
      within(screen.getByText('아이디').closest('dl')!).getByText('테스트맘'),
    ).toBeInTheDocument()
    expect(screen.queryByText('저장되었습니다.')).not.toBeInTheDocument()
    expect(editButton()).toHaveFocus()
  })

  it('취소한 내용은 버려지고 다시 열면 원래 값이 보인다', async () => {
    signIn({ nickname: '테스트맘' })
    renderApp('/me')
    const user = await startEditing()
    await changeNickname(user, '바꾸는 중')
    await user.click(screen.getByRole('button', { name: '취소' }))

    await user.click(editButton())

    expect(screen.getByLabelText('닉네임')).toHaveValue('테스트맘')
  })
})

describe('내 정보 - 입력 검증과 오류', () => {
  it('닉네임이 비면 요청을 보내지 않고 수정 화면에 머문다', async () => {
    signIn()
    renderApp('/me')
    const user = await startEditing()

    await user.clear(screen.getByLabelText('닉네임'))
    await user.click(save())

    expect(
      screen.getByText('닉네임은 1~20자로 입력해 주세요.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, PATCH)).toHaveLength(0)
    expect(screen.getByLabelText('닉네임')).toBeInTheDocument()
  })

  it('바꾼 출산 예정일이 범위를 벗어나면 요청을 보내지 않는다', async () => {
    signIn()
    renderApp('/me')
    const user = await startEditing()

    await user.clear(screen.getByLabelText('출산 예정일'))
    await user.type(screen.getByLabelText('출산 예정일'), '2020-01-01')
    await user.click(save())

    expect(
      screen.getByText('출산 예정일은 오늘부터 280일 이내여야 합니다.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, PATCH)).toHaveLength(0)
  })

  it('예정일이 이미 지난 사용자도 닉네임은 바꿀 수 있다', async () => {
    signIn({ dueDate: '2020-01-01' })
    mockApi(fetchMock, {
      [PATCH]: () =>
        jsonResponse(200, {
          ...userBody,
          due_date: '2020-01-01',
          nickname: '새닉',
        }),
    })
    renderApp('/me')
    const user = await startEditing()

    await changeNickname(user, '새닉')
    await user.click(save())

    await screen.findByText('저장되었습니다.')
    expect(bodyOf()).toEqual({ nickname: '새닉' })
  })

  it('서버의 필드별 오류는 수정 화면에 그대로 보여주고 조회로 돌아가지 않는다', async () => {
    signIn()
    mockApi(fetchMock, {
      [PATCH]: () =>
        jsonResponse(422, {
          error: {
            code: 'VALIDATION_ERROR',
            message: '요청 값이 올바르지 않습니다.',
            fields: { nickname: '서버가 거절한 닉네임입니다.' },
          },
        }),
    })
    renderApp('/me')
    const user = await startEditing()

    await changeNickname(user, '닉네임')
    await user.click(save())

    expect(
      await screen.findByText('서버가 거절한 닉네임입니다.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('닉네임')).toBeInTheDocument()
    expect(screen.queryByText('저장되었습니다.')).not.toBeInTheDocument()
    expect(useAuthStore.getState().user?.nickname).toBe('맘핏')
  })

  it('저장에 실패하면 안내를 보여주고 수정 화면에 머문다', async () => {
    signIn()
    mockApi(fetchMock, { [PATCH]: () => errorResponse(500, 'INTERNAL') })
    renderApp('/me')
    const user = await startEditing()

    await changeNickname(user, '닉네임')
    await user.click(save())

    expect(await screen.findByText('INTERNAL 메시지')).toBeInTheDocument()
    expect(screen.getByLabelText('닉네임')).toHaveValue('닉네임')
    expect(screen.queryByText('저장되었습니다.')).not.toBeInTheDocument()
  })

  it('저장하는 동안에는 저장과 취소를 잠근다', async () => {
    signIn()
    let finish: (response: Response) => void = () => {}
    mockApi(fetchMock, {
      [PATCH]: () =>
        new Promise<Response>((resolve) => {
          finish = resolve
        }),
    })
    renderApp('/me')
    const user = await startEditing()
    await changeNickname(user, '닉네임')

    await user.click(save())

    expect(
      await screen.findByRole('button', { name: '저장 중...' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled()
    finish(jsonResponse(200, { ...userBody, nickname: '닉네임' }))
    await screen.findByText('저장되었습니다.')
  })
})
