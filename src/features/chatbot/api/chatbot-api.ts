import { apiRequest } from '../../../shared/api'
import type { ChatKind, ChatReply } from '../types'

// 서버는 snake_case로 응답한다. 앱 안에서는 camelCase를 쓴다.
interface ChatResponse {
  kind: ChatKind
  answer: string
  sources: {
    title: string
    publisher: string
    jurisdiction: string
    url: string
    checked_at?: string
  }[]
}

// 챗봇 서비스는 백엔드와 같은 Bearer 토큰과 에러 형식을 쓰므로 공통 API 클라이언트를 그대로 쓴다.
export async function sendChatMessage(question: string): Promise<ChatReply> {
  const response = await apiRequest<ChatResponse>('/chat/messages', {
    method: 'POST',
    body: { question },
  })
  return {
    kind: response.kind,
    answer: response.answer,
    sources: response.sources.map((source) => ({
      title: source.title,
      publisher: source.publisher,
      jurisdiction: source.jurisdiction,
      url: source.url,
      checkedAt: source.checked_at ?? '',
    })),
  }
}
