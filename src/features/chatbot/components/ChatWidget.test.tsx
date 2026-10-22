import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { configureApiClient } from '../../../shared/api'
import { errorResponse, jsonResponse } from '../../../test/auth-test-utils'
import { mockReducedMotion } from '../../../test/motion'
import ChatWidget from './ChatWidget'

const fetchMock = vi.fn<typeof fetch>()

const NOTE = '※ 일반 정보이며 의료 조언이 아닙니다.'

function reply(overrides: Record<string, unknown> = {}) {
  return jsonResponse(200, {
    kind: 'answer',
    answer: `임신 중에는 물을 충분히 마시세요.\n\n${NOTE}`,
    sources: [
      {
        title: 'Exercise in pregnancy',
        publisher: 'NHS',
        jurisdiction: 'UK',
        url: 'https://www.nhs.uk/pregnancy/keeping-well/exercise/',
        checked_at: '2026-10-21',
      },
    ],
    ...overrides,
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  configureApiClient({
    getAccessToken: () => 'tok',
    refreshAccessToken: async () => null,
    onAuthFailure: vi.fn(),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderWidget() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ChatWidget nickname="테스트맘" />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const launcher = () => screen.getByRole('button', { name: '피치에게 물어보기' })
const input = () => screen.getByRole('textbox', { name: '질문 입력' })
const sendButton = () => screen.getByRole('button', { name: '보내기' })

async function ask(user: ReturnType<typeof userEvent.setup>, question: string) {
  await user.type(input(), question)
  await user.click(sendButton())
}

describe('ChatWidget 열고 닫기', () => {
  it('캐릭터 아래에 "물어보기" 라벨이 보이고 라벨을 눌러도 열린다', async () => {
    const user = renderWidget()

    const label = screen.getByText('물어보기')
    expect(label).toBeVisible()
    // 보이는 글자가 접근성 이름에 들어 있어 보이는 말과 읽히는 말이 같다.
    expect(launcher()).toHaveAccessibleName(/물어보기/)

    await user.click(label)

    expect(screen.getByRole('dialog', { name: '피치' })).toBeInTheDocument()
  })

  it('열려 있을 때 라벨은 "닫기"로 바뀐다', async () => {
    const user = renderWidget()

    await user.click(launcher())

    expect(screen.getByText('닫기')).toBeInTheDocument()
    expect(screen.queryByText('물어보기')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '채팅창 닫기', expanded: true }),
    ).toHaveAccessibleName(/닫기/)
  })

  it('처음에는 캐릭터 버튼만 보이고 채팅창은 닫혀 있다', () => {
    renderWidget()

    expect(launcher()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('캐릭터를 누르면 채팅창이 열리고 입력칸에 포커스가 간다', async () => {
    const user = renderWidget()

    await user.click(launcher())

    const dialog = screen.getByRole('dialog', { name: '피치' })
    expect(
      within(dialog).getByText(/테스트맘님, 안녕하세요!/),
    ).toBeInTheDocument()
    expect(input()).toHaveFocus()
    expect(
      screen.getByRole('button', { name: '채팅창 닫기', expanded: true }),
    ).toBeInTheDocument()
  })

  it('면책 안내와 대화를 기억하지 못한다는 안내를 보여준다', async () => {
    const user = renderWidget()

    await user.click(launcher())

    expect(screen.getByText(/의학적 조언이 아니며/)).toBeInTheDocument()
    expect(screen.getByText(/이전 대화는 기억하지 못해요/)).toBeInTheDocument()
  })

  it('Esc를 누르면 닫히고 포커스가 캐릭터 버튼으로 돌아온다', async () => {
    const user = renderWidget()
    await user.click(launcher())

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(launcher()).toHaveFocus()
  })

  it('닫기 버튼으로도 닫을 수 있다', async () => {
    const user = renderWidget()
    await user.click(launcher())

    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: '채팅창 닫기',
      }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('ChatWidget 질문과 답변', () => {
  it('질문을 보내면 답변과 출처, 면책 문구를 보여주고 입력칸을 비운다', async () => {
    fetchMock.mockResolvedValueOnce(reply())
    const user = renderWidget()
    await user.click(launcher())

    await ask(user, '  물은 어떻게 마셔요?  ')

    expect(
      await screen.findByText('임신 중에는 물을 충분히 마시세요.'),
    ).toBeInTheDocument()
    expect(screen.getByText('물은 어떻게 마셔요?')).toBeInTheDocument()
    expect(screen.getByText(NOTE)).toBeInTheDocument()
    expect(screen.getByText('출처 1개')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Exercise in pregnancy' })
    expect(link).toHaveAttribute(
      'href',
      'https://www.nhs.uk/pregnancy/keeping-well/exercise/',
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(screen.getByText(/NHS · 영국 · 2026-10-21 확인/)).toBeInTheDocument()
    expect(input()).toHaveValue('')
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      question: '물은 어떻게 마셔요?',
    })
  })

  it('보낸 뒤에도 포커스가 입력칸에 남아 이어서 입력하거나 Esc로 닫을 수 있다', async () => {
    fetchMock.mockResolvedValueOnce(reply())
    const user = renderWidget()
    await user.click(launcher())

    await ask(user, '물은요?')

    expect(input()).toHaveFocus()
  })

  it('Enter 키로도 보낸다', async () => {
    fetchMock.mockResolvedValueOnce(reply())
    const user = renderWidget()
    await user.click(launcher())

    await user.type(input(), '물은요?{Enter}')

    expect(
      await screen.findByText('임신 중에는 물을 충분히 마시세요.'),
    ).toBeInTheDocument()
  })

  it('위험 신호 응답은 알림으로 눈에 띄게 보여준다', async () => {
    fetchMock.mockResolvedValueOnce(
      reply({
        kind: 'emergency',
        answer:
          '운동을 멈추고 담당 산부인과에 연락하세요. 응급이면 119에 연락하세요.',
      }),
    )
    const user = renderWidget()
    await user.click(launcher())

    await ask(user, '운동하다가 피가 났어요')

    expect(await screen.findByRole('alert')).toHaveTextContent('119')
  })

  it('빈 입력이나 공백만 있으면 보낼 수 없다', async () => {
    const user = renderWidget()
    await user.click(launcher())

    expect(sendButton()).toBeDisabled()
    await user.type(input(), '   ')
    expect(sendButton()).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('답을 기다리는 동안 상태를 알리고 중복해서 보내지 못한다', async () => {
    let resolve: (value: Response) => void = () => {}
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => (resolve = r)))
    const user = renderWidget()
    await user.click(launcher())

    await ask(user, '첫 질문')

    expect(await screen.findByRole('status')).toHaveTextContent(
      '답변을 찾고 있어요',
    )
    await user.type(input(), '두 번째 질문')
    expect(sendButton()).toBeDisabled()
    await user.keyboard('{Enter}')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolve(reply())
    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    )
    expect(sendButton()).toBeEnabled()
  })

  it('예시 질문을 누르면 바로 보내고, 질문한 뒤에는 예시를 숨긴다', async () => {
    fetchMock.mockResolvedValueOnce(reply())
    const user = renderWidget()
    await user.click(launcher())

    await user.click(
      screen.getByRole('button', {
        name: '임신 중에 피해야 하는 운동이 뭐예요?',
      }),
    )

    expect(
      await screen.findByText('임신 중에는 물을 충분히 마시세요.'),
    ).toBeInTheDocument()
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      question: '임신 중에 피해야 하는 운동이 뭐예요?',
    })
    expect(
      screen.queryByRole('button', {
        name: '운동을 멈춰야 하는 위험 신호가 뭐예요?',
      }),
    ).not.toBeInTheDocument()
  })

  it('닫았다 다시 열어도 대화가 이어진다', async () => {
    fetchMock.mockResolvedValueOnce(reply())
    const user = renderWidget()
    await user.click(launcher())
    await ask(user, '물은요?')
    await screen.findByText('임신 중에는 물을 충분히 마시세요.')

    await user.keyboard('{Escape}')
    await user.click(launcher())

    expect(screen.getByText('물은요?')).toBeInTheDocument()
    expect(
      screen.getByText('임신 중에는 물을 충분히 마시세요.'),
    ).toBeInTheDocument()
  })

  it('https가 아닌 출처 주소는 링크로 열지 않는다', async () => {
    fetchMock.mockResolvedValueOnce(
      reply({
        sources: [
          {
            title: '안전하지 않은 주소',
            publisher: 'X',
            jurisdiction: 'US',
            url: 'javascript:alert(1)',
          },
          {
            title: '평문 주소',
            publisher: 'Y',
            jurisdiction: 'UK',
            url: 'http://example.com',
          },
        ],
      }),
    )
    const user = renderWidget()
    await user.click(launcher())

    await ask(user, '질문')

    await screen.findByText('출처 2개')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('안전하지 않은 주소')).toBeInTheDocument()
    expect(screen.getByText('평문 주소')).toBeInTheDocument()
  })
})

describe('ChatWidget 실패 처리', () => {
  it('호출 제한은 서버가 준 안내를 보여주고 대화는 유지한다', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(429, 'RATE_LIMITED'))
    const user = renderWidget()
    await user.click(launcher())

    await ask(user, '질문')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'RATE_LIMITED 메시지',
    )
    expect(screen.getByText('질문')).toBeInTheDocument()
    expect(sendButton()).toBeDisabled() // 입력이 비어 있어서
  })

  it('서버 오류는 내부 사정을 드러내지 않는 문구로 안내한다', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(503, 'SERVICE_UNAVAILABLE'))
    const user = renderWidget()
    await user.click(launcher())

    await ask(user, '질문')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('지금은 답변을 만들 수 없어요')
    expect(alert).not.toHaveTextContent('SERVICE_UNAVAILABLE')
  })

  it('네트워크가 끊기면 연결을 확인하라고 안내하고 다시 보낼 수 있다', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    fetchMock.mockResolvedValueOnce(reply())
    const user = renderWidget()
    await user.click(launcher())

    await ask(user, '첫 질문')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '네트워크 연결을 확인해 주세요.',
    )

    await ask(user, '다시 질문')
    expect(
      await screen.findByText('임신 중에는 물을 충분히 마시세요.'),
    ).toBeInTheDocument()
  })
})

describe('ChatWidget 타자 효과', () => {
  const ANSWER = '임신 중에는 물을 충분히 마시고 시원하게 운동하세요.'
  const hidden = () => document.querySelector('.text-transparent')

  beforeEach(() => {
    // 테스트는 기본으로 동작 줄이기를 켜 두므로, 효과를 검증할 때만 끈다.
    mockReducedMotion(false)
  })

  it('답변 글자가 차례로 나타나고, 끝나면 전체 글이 보인다', async () => {
    fetchMock.mockResolvedValueOnce(reply({ answer: `${ANSWER}\n\n${NOTE}` }))
    const user = renderWidget()
    await user.click(launcher())

    await ask(user, '물은요?')

    await waitFor(() => expect(hidden()).toBeInTheDocument())
    await waitFor(() => expect(hidden()).not.toBeInTheDocument())
    expect(screen.getByText(ANSWER)).toBeInTheDocument()
  })

  it('효과가 진행되는 동안에도 전체 문장이 들어 있어 스크린리더는 한 번에 읽는다', async () => {
    fetchMock.mockResolvedValueOnce(reply({ answer: ANSWER }))
    const user = renderWidget()
    await user.click(launcher())

    await ask(user, '물은요?')

    await waitFor(() => expect(hidden()).toBeInTheDocument())
    expect(hidden()?.parentElement).toHaveTextContent(ANSWER)
  })

  it('위험 신호 안내는 효과 없이 바로 보인다', async () => {
    fetchMock.mockResolvedValueOnce(
      reply({
        kind: 'emergency',
        answer:
          '운동을 멈추고 담당 산부인과에 연락하세요. 응급이면 119에 연락하세요.',
      }),
    )
    const user = renderWidget()
    await user.click(launcher())

    await ask(user, '운동하다가 피가 났어요')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '119에 연락하세요.',
    )
    expect(hidden()).not.toBeInTheDocument()
  })

  it('오류 안내도 효과 없이 바로 보인다', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(503, 'SERVICE_UNAVAILABLE'))
    const user = renderWidget()
    await user.click(launcher())

    await ask(user, '질문')

    await screen.findByRole('alert')
    expect(hidden()).not.toBeInTheDocument()
  })

  it('효과가 진행 중에 창을 닫았다 열면 처음부터 다시 치지 않고 전체 글을 보여준다', async () => {
    fetchMock.mockResolvedValueOnce(reply({ answer: ANSWER }))
    const user = renderWidget()
    await user.click(launcher())
    await ask(user, '물은요?')
    await waitFor(() => expect(hidden()).toBeInTheDocument())

    await user.keyboard('{Escape}')
    await user.click(launcher())

    expect(hidden()).not.toBeInTheDocument()
    expect(screen.getByText(ANSWER)).toBeInTheDocument()
  })

  it('동작 줄이기 설정이면 효과 없이 바로 보인다', async () => {
    mockReducedMotion(true)
    fetchMock.mockResolvedValueOnce(reply({ answer: ANSWER }))
    const user = renderWidget()
    await user.click(launcher())

    await ask(user, '물은요?')

    expect(await screen.findByText(ANSWER)).toBeInTheDocument()
    expect(hidden()).not.toBeInTheDocument()
  })
})

describe('ChatWidget 스크롤', () => {
  // jsdom은 레이아웃을 계산하지 않으므로, 목록 높이와 말풍선 위치를 정해 두고 스크롤 값을 확인한다.
  const SCROLL_HEIGHT = 1000
  const BUBBLE_TOP = 300
  const spies: { mockRestore: () => void }[] = []

  beforeEach(() => {
    spies.push(
      vi
        .spyOn(Element.prototype, 'scrollHeight', 'get')
        .mockReturnValue(SCROLL_HEIGHT),
      vi
        .spyOn(HTMLElement.prototype, 'offsetTop', 'get')
        .mockReturnValue(BUBBLE_TOP),
    )
  })

  afterEach(() => {
    spies.splice(0).forEach((spy) => spy.mockRestore())
  })

  const list = () => screen.getByRole('log').parentElement as HTMLElement

  it('질문을 보내면 내 질문과 대기 표시가 보이도록 맨 아래로 내린다', async () => {
    fetchMock.mockReturnValueOnce(new Promise<Response>(() => {}))
    const user = renderWidget()
    await user.click(launcher())

    await ask(user, '물은요?')

    await screen.findByRole('status')
    expect(list().scrollTop).toBe(SCROLL_HEIGHT)
  })

  it('답변이 도착하면 맨 아래가 아니라 답변의 시작이 보이게 맞춘다', async () => {
    fetchMock.mockResolvedValueOnce(reply({ answer: '긴 답변입니다.' }))
    const user = renderWidget()
    await user.click(launcher())

    await ask(user, '물은요?')

    await screen.findByText('긴 답변입니다.')
    // 말풍선 위치(300)에서 위쪽 여백(12)을 뺀 곳
    expect(list().scrollTop).toBe(BUBBLE_TOP - 12)
    expect(list().scrollTop).not.toBe(SCROLL_HEIGHT)
  })

  it('타자 효과가 끝나도 읽던 위치를 다시 옮기지 않는다', async () => {
    mockReducedMotion(false)
    fetchMock.mockResolvedValueOnce(
      reply({ answer: '임신 중에는 물을 충분히 마시세요.' }),
    )
    const user = renderWidget()
    await user.click(launcher())
    await ask(user, '물은요?')
    await waitFor(() =>
      expect(document.querySelector('.text-transparent')).toBeInTheDocument(),
    )

    list().scrollTop = 150 // 사용자가 직접 스크롤한 위치

    await waitFor(() =>
      expect(
        document.querySelector('.text-transparent'),
      ).not.toBeInTheDocument(),
    )
    expect(list().scrollTop).toBe(150)
  })
})
