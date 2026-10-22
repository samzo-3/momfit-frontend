import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { memberDetailBody } from '../../../test/admin-test-utils'
import {
  errorResponse,
  jsonResponse,
  mockApi,
  requestsTo,
  resetAuthStore,
  signIn,
} from '../../../test/auth-test-utils'
import { renderApp } from '../../../test/render-app'

const fetchMock = vi.fn<typeof fetch>()
const DETAIL = 'GET /api/admin/members/1'
const WITHDRAW = 'POST /api/admin/members/1/withdraw'
const RESTORE = 'POST /api/admin/members/1/restore'

const withdrawn = {
  status: 'withdrawn',
  withdrawn_at: '2026-10-22T06:00:00Z',
  purge_at: '2026-11-21T06:00:00Z',
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  resetAuthStore()
  signIn({ role: 'admin' })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('회원 상세', () => {
  it('프로필, 최근 운동 기록, 처리 이력을 보여 준다', async () => {
    mockApi(fetchMock, {
      [DETAIL]: () => jsonResponse(200, memberDetailBody()),
    })
    renderApp('/admin/members/1')

    const profile = await screen.findByRole('region', { name: '회원 정보' })
    expect(within(profile).getByText('mom@example.com')).toBeInTheDocument()
    expect(within(profile).getByText('아이디 (momfit01)')).toBeInTheDocument()
    expect(within(profile).getByText('보통')).toBeInTheDocument()
    expect(within(profile).getByText('2027. 1. 11.')).toBeInTheDocument()
    expect(within(profile).getByText('12일')).toBeInTheDocument()
    expect(within(profile).queryByText('삭제 예정')).not.toBeInTheDocument()

    const records = screen.getByRole('region', { name: '최근 운동 기록' })
    const rows = within(records).getAllByRole('row')
    expect(within(rows[1]).getByText('사이드 킥')).toBeInTheDocument()
    expect(within(rows[1]).getByText('91.5점')).toBeInTheDocument()
    expect(within(rows[2]).getByText('진행 중')).toBeInTheDocument()

    const history = screen.getByRole('region', { name: '처리 이력' })
    expect(within(history).getByText('회원 정보 조회')).toBeInTheDocument()
    expect(within(history).getByText('운영자')).toBeInTheDocument()
  })

  it('상세는 한 번만 요청한다(조회 이력이 불어나지 않게)', async () => {
    mockApi(fetchMock, {
      [DETAIL]: () => jsonResponse(200, memberDetailBody()),
    })
    renderApp('/admin/members/1')

    await screen.findByRole('region', { name: '회원 정보' })
    window.dispatchEvent(new Event('focus'))

    expect(requestsTo(fetchMock, DETAIL)).toHaveLength(1)
  })

  it('운동 기록이 없으면 안내 문구를 보여 준다', async () => {
    mockApi(fetchMock, {
      [DETAIL]: () =>
        jsonResponse(200, memberDetailBody({ recent_records: [] })),
    })
    renderApp('/admin/members/1')

    expect(await screen.findByText('운동 기록이 없어요.')).toBeInTheDocument()
  })

  it('탈퇴 유예 회원은 삭제 예정일을 보여 준다', async () => {
    mockApi(fetchMock, {
      [DETAIL]: () => jsonResponse(200, memberDetailBody(withdrawn)),
    })
    renderApp('/admin/members/1')

    const profile = await screen.findByRole('region', { name: '회원 정보' })
    expect(within(profile).getByText('삭제 예정')).toBeInTheDocument()
    expect(within(profile).getByText('2026. 11. 21. 15:00')).toBeInTheDocument()
  })

  it('강제 탈퇴는 확인을 거친 뒤 처리하고 화면을 바꾼다', async () => {
    mockApi(fetchMock, {
      [DETAIL]: () => jsonResponse(200, memberDetailBody()),
      [WITHDRAW]: () =>
        jsonResponse(
          200,
          memberDetailBody({
            ...withdrawn,
            history: [
              {
                action: 'withdraw_member',
                admin_nickname: '운영자',
                created_at: '2026-10-22T06:00:00Z',
              },
            ],
          }),
        ),
    })
    const user = userEvent.setup()
    renderApp('/admin/members/1')
    await screen.findByRole('region', { name: '회원 정보' })

    await user.click(screen.getByRole('button', { name: '강제 탈퇴' }))
    expect(requestsTo(fetchMock, WITHDRAW)).toHaveLength(0) // 확인 전에는 요청하지 않는다
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText('맘핏님을 탈퇴 처리할까요?'),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '강제 탈퇴' }))

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '탈퇴 복구' }),
      ).toBeInTheDocument(),
    )
    expect(requestsTo(fetchMock, WITHDRAW)).toHaveLength(1)
    expect(requestsTo(fetchMock, DETAIL)).toHaveLength(1) // 조치 후 다시 조회하지 않는다
    const history = screen.getByRole('region', { name: '처리 이력' })
    expect(within(history).getByText('강제 탈퇴')).toBeInTheDocument()
  })

  it('확인 창에서 취소하면 처리하지 않는다', async () => {
    mockApi(fetchMock, {
      [DETAIL]: () => jsonResponse(200, memberDetailBody()),
    })
    const user = userEvent.setup()
    renderApp('/admin/members/1')
    await screen.findByRole('region', { name: '회원 정보' })

    await user.click(screen.getByRole('button', { name: '강제 탈퇴' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: '취소',
      }),
    )

    expect(requestsTo(fetchMock, WITHDRAW)).toHaveLength(0)
    expect(
      screen.getByRole('button', { name: '강제 탈퇴' }),
    ).toBeInTheDocument()
  })

  it('복구하면 이용 중 상태로 바뀐다', async () => {
    mockApi(fetchMock, {
      [DETAIL]: () => jsonResponse(200, memberDetailBody(withdrawn)),
      [RESTORE]: () => jsonResponse(200, memberDetailBody()),
    })
    const user = userEvent.setup()
    renderApp('/admin/members/1')
    await screen.findByRole('region', { name: '회원 정보' })

    await user.click(screen.getByRole('button', { name: '탈퇴 복구' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '복구' }))

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '강제 탈퇴' }),
      ).toBeInTheDocument(),
    )
    expect(requestsTo(fetchMock, RESTORE)).toHaveLength(1)
  })

  it('처리에 실패하면 확인 창에 이유를 보여 준다', async () => {
    mockApi(fetchMock, {
      [DETAIL]: () => jsonResponse(200, memberDetailBody()),
      [WITHDRAW]: () => errorResponse(409, 'MEMBER_ALREADY_WITHDRAWN'),
    })
    const user = userEvent.setup()
    renderApp('/admin/members/1')
    await screen.findByRole('region', { name: '회원 정보' })

    await user.click(screen.getByRole('button', { name: '강제 탈퇴' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '강제 탈퇴' }))

    expect(
      await within(dialog).findByText('이미 탈퇴 처리된 회원이에요.'),
    ).toBeInTheDocument()
  })

  it('없는 회원이면 안내와 목록 링크를 보여 준다', async () => {
    mockApi(fetchMock, {
      [DETAIL]: () => errorResponse(404, 'MEMBER_NOT_FOUND'),
    })
    renderApp('/admin/members/1')

    expect(
      await screen.findByText('회원을 찾을 수 없어요.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '회원 목록으로' })).toHaveAttribute(
      'href',
      '/admin/members',
    )
  })

  it('주소의 id가 숫자가 아니면 404 화면이다', async () => {
    renderApp('/admin/members/abc')

    expect(
      await screen.findByRole('heading', { name: '페이지를 찾을 수 없습니다' }),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
