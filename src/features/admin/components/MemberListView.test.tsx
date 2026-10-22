import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { memberItem, memberListBody } from '../../../test/admin-test-utils'
import {
  jsonResponse,
  mockApi,
  requestsTo,
  resetAuthStore,
  signIn,
  errorResponse,
} from '../../../test/auth-test-utils'
import { renderApp } from '../../../test/render-app'

const fetchMock = vi.fn<typeof fetch>()
const LIST = 'GET /api/admin/members'

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  resetAuthStore()
  signIn({ role: 'admin' })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function lastParams() {
  const calls = requestsTo(fetchMock, LIST)
  return new URL(String(calls[calls.length - 1][0]), 'http://x').searchParams
}

describe('회원 목록', () => {
  it('회원 행에 필요한 정보와 상세 링크를 보여 준다', async () => {
    mockApi(fetchMock, {
      [LIST]: () =>
        jsonResponse(
          200,
          memberListBody([
            memberItem(),
            memberItem({
              id: 2,
              nickname: '카카오맘',
              email: null,
              login_id: null,
              provider: 'kakao',
              status: 'withdrawn',
              last_visit_date: null,
              completed_exercises: 0,
            }),
          ]),
        ),
    })
    renderApp('/admin/members')

    const table = await screen.findByRole('table', { name: '회원 목록' })
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(within(rows[1]).getByRole('link', { name: '맘핏' })).toHaveAttribute(
      'href',
      '/admin/members/1',
    )
    expect(within(rows[1]).getByText('mom@example.com')).toBeInTheDocument()
    expect(within(rows[1]).getByText('이용 중')).toBeInTheDocument()
    expect(within(rows[1]).getByText('2026. 10. 21.')).toBeInTheDocument()
    expect(within(rows[1]).getByText('7회')).toBeInTheDocument()
    expect(within(rows[2]).getByText('카카오')).toBeInTheDocument()
    expect(within(rows[2]).getByText('탈퇴 유예')).toBeInTheDocument()
    expect(within(rows[2]).getAllByText('-').length).toBeGreaterThanOrEqual(2)
  })

  it('처음에는 1쪽을 필터 없이 요청한다', async () => {
    mockApi(fetchMock, { [LIST]: () => jsonResponse(200, memberListBody([])) })
    renderApp('/admin/members')

    await screen.findByText('조건에 맞는 회원이 없어요.')
    const params = lastParams()
    expect(params.get('page')).toBe('1')
    expect(params.get('q')).toBeNull()
    expect(params.get('status')).toBeNull()
  })

  it('주소의 검색 조건으로 시작한다', async () => {
    mockApi(fetchMock, { [LIST]: () => jsonResponse(200, memberListBody([])) })
    renderApp('/admin/members?q=맘&status=withdrawn&page=3')

    await screen.findByText('조건에 맞는 회원이 없어요.')
    const params = lastParams()
    expect(params.get('q')).toBe('맘')
    expect(params.get('status')).toBe('withdrawn')
    expect(params.get('page')).toBe('3')
    expect(screen.getByRole('searchbox', { name: '검색' })).toHaveValue('맘')
    expect(screen.getByRole('button', { name: '탈퇴 유예' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('검색하면 검색어로 1쪽부터 다시 요청한다', async () => {
    mockApi(fetchMock, {
      [LIST]: () => jsonResponse(200, memberListBody([memberItem()])),
    })
    const user = userEvent.setup()
    const router = renderApp('/admin/members?page=2')
    await screen.findByRole('table', { name: '회원 목록' })

    await user.type(screen.getByRole('searchbox', { name: '검색' }), ' 맘핏 ')
    await user.click(screen.getByRole('button', { name: '검색' }))

    await waitFor(() => expect(lastParams().get('q')).toBe('맘핏'))
    expect(lastParams().get('page')).toBe('1')
    expect(router.state.location.search).toBe('?q=%EB%A7%98%ED%95%8F')
  })

  it('상태 필터를 누르면 그 상태만 요청한다', async () => {
    mockApi(fetchMock, {
      [LIST]: () => jsonResponse(200, memberListBody([memberItem()])),
    })
    const user = userEvent.setup()
    renderApp('/admin/members')
    await screen.findByRole('table', { name: '회원 목록' })

    await user.click(screen.getByRole('button', { name: '이용 중' }))

    await waitFor(() => expect(lastParams().get('status')).toBe('active'))
    expect(screen.getByRole('button', { name: '전체' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('페이지를 넘기고, 처음과 끝에서는 막는다', async () => {
    mockApi(fetchMock, {
      [LIST]: ({ url }) => {
        const page = Number(new URL(url, 'http://x').searchParams.get('page'))
        return jsonResponse(
          200,
          memberListBody([memberItem({ id: page, nickname: `회원${page}` })], {
            total: 45,
            page,
          }),
        )
      },
    })
    const user = userEvent.setup()
    renderApp('/admin/members')

    expect(
      await screen.findByText(/총 45명 · 1 \/ 3 페이지/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(await screen.findByText(/2 \/ 3 페이지/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(await screen.findByText(/3 \/ 3 페이지/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  it('불러오지 못하면 오류 안내를 보여 준다', async () => {
    mockApi(fetchMock, { [LIST]: () => errorResponse(500, 'SERVER_ERROR') })
    renderApp('/admin/members')

    expect(
      await screen.findByText('회원 목록을 불러오지 못했어요.'),
    ).toBeInTheDocument()
  })

  it('관리자 탭으로 현황과 회원관리를 오간다', async () => {
    mockApi(fetchMock, { [LIST]: () => jsonResponse(200, memberListBody([])) })
    renderApp('/admin/members')

    const tabs = await screen.findByRole('navigation', { name: '관리자 메뉴' })
    expect(
      within(tabs).getByRole('link', { name: '회원관리' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(within(tabs).getByRole('link', { name: '현황' })).toHaveAttribute(
      'href',
      '/admin',
    )
    expect(
      within(tabs).getByRole('link', { name: '현황' }),
    ).not.toHaveAttribute('aria-current')
  })
})
