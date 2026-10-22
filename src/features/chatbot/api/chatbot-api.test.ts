import { configureApiClient } from '../../../shared/api'
import { ApiError } from '../../../shared/api'
import { errorResponse, jsonResponse } from '../../../test/auth-test-utils'
import { sendChatMessage } from './chatbot-api'

const fetchMock = vi.fn<typeof fetch>()

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

describe('sendChatMessage', () => {
  it('질문을 POST로 보내고 응답을 camelCase로 바꾼다', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        kind: 'answer',
        answer: '답변',
        sources: [
          {
            title: '제목',
            publisher: 'NHS',
            jurisdiction: 'UK',
            url: 'https://www.nhs.uk/x',
            checked_at: '2026-10-21',
          },
        ],
      }),
    )

    const reply = await sendChatMessage('물은요?')

    expect(reply).toEqual({
      kind: 'answer',
      answer: '답변',
      sources: [
        {
          title: '제목',
          publisher: 'NHS',
          jurisdiction: 'UK',
          url: 'https://www.nhs.uk/x',
          checkedAt: '2026-10-21',
        },
      ],
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/chat/messages')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer tok')
    expect(JSON.parse(String(init?.body))).toEqual({ question: '물은요?' })
  })

  it('확인일이 없는 출처는 빈 문자열로 둔다', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        kind: 'emergency',
        answer: '멈추세요',
        sources: [
          {
            title: 'ACOG',
            publisher: 'ACOG',
            jurisdiction: 'US',
            url: 'https://www.acog.org',
          },
        ],
      }),
    )

    const reply = await sendChatMessage('피가 났어요')

    expect(reply.sources[0].checkedAt).toBe('')
  })

  it('서버 에러는 ApiError로 올린다', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(429, 'RATE_LIMITED'))

    await expect(sendChatMessage('q')).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
    })
    expect(ApiError).toBeDefined()
  })
})
