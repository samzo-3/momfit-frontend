// 챗봇 응답의 종류 (docs/chatbot-api.md)
// answer: 자료를 근거로 한 답변 / emergency: 위험 신호 안내 / no_answer: 근거 없음 / out_of_scope: 범위 밖 질문
export type ChatKind = 'answer' | 'emergency' | 'no_answer' | 'out_of_scope'

export interface ChatSource {
  title: string
  publisher: string
  // KR, US, UK, INTL 같은 자료의 나라·지역 코드
  jurisdiction: string
  url: string
  // 자료를 마지막으로 확인한 날 (없으면 빈 문자열)
  checkedAt: string
}

export interface ChatReply {
  kind: ChatKind
  answer: string
  sources: ChatSource[]
}

// 화면에 그리는 말풍선 하나. error는 서버 응답이 아니라 요청 실패를 안내하는 말풍선이다.
export interface ChatMessage {
  id: number
  role: 'user' | 'bot'
  text: string
  kind?: ChatKind | 'error'
  sources?: ChatSource[]
  // true이면 아직 글자가 하나씩 나타나는 중이다. 위험 신호·오류·사용자 말풍선은 쓰지 않는다.
  typing?: boolean
}
