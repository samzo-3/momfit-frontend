import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  errorResponse,
  jsonResponse,
  mockApi,
  requestsTo,
  resetAuthStore,
  signIn,
} from '../../../test/auth-test-utils'
import { renderApp } from '../../../test/render-app'
import { setupAuth } from '../auth-session'
import { useAuthStore } from '../store/auth-store'

const fetchMock = vi.fn<typeof fetch>()
const DELETE = 'DELETE /api/users/me'

const openConfirm = async () => {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))
  return user
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  resetAuthStore()
  setupAuth()
  signIn()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('회원 탈퇴', () => {
  it('처음에는 확인 없이 요청을 보내지 않는다', async () => {
    renderApp('/me')

    expect(
      screen.getByText(/계정과 건강정보.*삭제되며 되돌릴 수 없어요/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, DELETE)).toHaveLength(0)
  })

  it('버튼을 누르면 확인 모달이 열린다', async () => {
    renderApp('/me')
    await openConfirm()

    const dialog = screen.getByRole('dialog', { name: '정말 탈퇴하시겠어요?' })
    expect(dialog).toHaveTextContent('되돌릴 수 없어요')
    expect(within(dialog).getByRole('button', { name: '취소' })).toHaveFocus()
    expect(requestsTo(fetchMock, DELETE)).toHaveLength(0)
  })

  it('모달에서 취소하면 요청 없이 닫힌다', async () => {
    renderApp('/me')
    const user = await openConfirm()

    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, DELETE)).toHaveLength(0)
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('탈퇴하면 계정 삭제를 요청하고 로그아웃되어 랜딩으로 이동한다', async () => {
    mockApi(fetchMock, { [DELETE]: () => jsonResponse(204) })
    const router = renderApp('/me')
    const user = await openConfirm()

    await user.click(screen.getByRole('button', { name: '탈퇴하기' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(requestsTo(fetchMock, DELETE)).toHaveLength(1)
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(useAuthStore.getState().accessToken).toBeNull()
    // 랜딩이 비로그인 상태로 보이고, 헤더에서도 로그인한 사용자용 메뉴가 사라진다.
    expect(
      await screen.findByRole('heading', { level: 1, name: /임신 중에도/ }),
    ).toBeInTheDocument()
    const nav = within(screen.getByRole('navigation', { name: '주요' }))
    expect(nav.getByRole('link', { name: '로그인' })).toBeInTheDocument()
    expect(nav.queryByRole('link', { name: '내 정보' })).not.toBeInTheDocument()
  })

  it('요청 중에는 버튼을 잠근다', async () => {
    let finish: (response: Response) => void = () => {}
    mockApi(fetchMock, {
      [DELETE]: () =>
        new Promise<Response>((resolve) => {
          finish = resolve
        }),
    })
    renderApp('/me')
    const user = await openConfirm()

    await user.click(screen.getByRole('button', { name: '탈퇴하기' }))

    expect(
      await screen.findByRole('button', { name: '탈퇴 중...' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled()
    finish(jsonResponse(204))
    await waitFor(() =>
      expect(useAuthStore.getState().status).toBe('unauthenticated'),
    )
  })

  it('탈퇴에 실패하면 안내를 보여주고 로그인 상태를 유지한다', async () => {
    mockApi(fetchMock, { [DELETE]: () => errorResponse(500, 'INTERNAL') })
    const router = renderApp('/me')
    const user = await openConfirm()

    await user.click(screen.getByRole('button', { name: '탈퇴하기' }))

    expect(await screen.findByText('INTERNAL 메시지')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/me')
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('Esc로도 닫을 수 있고 요청은 보내지 않는다', async () => {
    renderApp('/me')
    const user = await openConfirm()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, DELETE)).toHaveLength(0)
  })

  it('실패 후 취소하면 오류 안내도 함께 지운다', async () => {
    mockApi(fetchMock, { [DELETE]: () => errorResponse(500, 'INTERNAL') })
    renderApp('/me')
    const user = await openConfirm()
    await user.click(screen.getByRole('button', { name: '탈퇴하기' }))
    await screen.findByText('INTERNAL 메시지')

    await user.click(screen.getByRole('button', { name: '취소' }))
    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))

    expect(screen.queryByText('INTERNAL 메시지')).not.toBeInTheDocument()
  })
})
