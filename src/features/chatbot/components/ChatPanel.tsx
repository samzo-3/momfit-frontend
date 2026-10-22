import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import Button from '../../../shared/components/Button'
import type { ChatMessage } from '../types'
import ChatbotMascot from './ChatbotMascot'
import ChatMessageItem from './ChatMessageItem'

// 처음 열었을 때 눌러 볼 수 있는 질문. 챗봇이 근거를 가진 주제에서 골랐다.
const EXAMPLE_QUESTIONS = [
  '임신 중 일주일에 운동을 얼마나 해야 해요?',
  '임신 중에 피해야 하는 운동이 뭐예요?',
  '운동을 멈춰야 하는 위험 신호가 뭐예요?',
]

const MAX_LENGTH = 500
// 답변의 시작을 맞출 때 위쪽에 남기는 여백(px). 이전 말풍선이 살짝 보이게 한다.
const ANSWER_TOP_GAP = 12

interface ChatPanelProps {
  // 닫혀도 나가는 애니메이션이 끝날 때까지 화면에 남는다.
  open: boolean
  visible: boolean
  nickname?: string
  messages: ChatMessage[]
  pending: boolean
  onSend: (question: string) => boolean
  onTypingDone: (id: number) => void
  onClose: () => void
}

// 채팅창. 대화 내용은 부모(useChat)가 들고 있어서 닫았다 열어도 이어진다.
function ChatPanel({
  open,
  visible,
  nickname,
  messages,
  pending,
  onSend,
  onTypingDone,
  onClose,
}: ChatPanelProps) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // 스크롤 위치는 마지막 말풍선이 바뀔 때만 정한다. 타자 효과가 끝나 messages가 다시 만들어져도 건드리지 않는다.
  const last = messages[messages.length - 1]
  const lastId = last?.id
  const lastIsBot = last?.role === 'bot'
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    if (lastIsBot && !pending) {
      // 답변은 길 수 있으니 맨 아래가 아니라 답변의 시작이 보이게 맞춘다. 위에서부터 읽을 수 있다.
      const bubble = list.querySelector<HTMLElement>(
        `[data-message-id="${lastId}"]`,
      )
      if (bubble) {
        list.scrollTop = Math.max(0, bubble.offsetTop - ANSWER_TOP_GAP)
        return
      }
    }
    // 내가 질문을 보냈거나 답을 기다리는 중이면 맨 아래의 내 질문과 대기 표시가 보이게 한다.
    list.scrollTop = list.scrollHeight
  }, [lastId, lastIsBot, pending])

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
    }
  }

  function submit(question: string) {
    if (!onSend(question)) return
    setDraft('')
    // 보내기 버튼이 비활성이 되면 포커스를 잃어 Esc 등 키보드 조작이 끊기므로 입력칸으로 돌려준다.
    inputRef.current?.focus()
  }

  const canSend = draft.trim().length > 0 && !pending
  const hasAsked = messages.some((message) => message.role === 'user')
  const greeting = nickname ? `${nickname}님, 안녕하세요!` : '안녕하세요!'

  return (
    <div
      id="chatbot-panel"
      role="dialog"
      aria-labelledby={titleId}
      data-state={visible ? 'open' : 'closed'}
      // 사라지는 동안에는 눌리거나 포커스를 받지 않게 한다.
      inert={!open}
      onKeyDown={handleKeyDown}
      className={`fixed right-4 bottom-[7.5rem] z-40 flex h-[min(42rem,calc(100dvh-9rem))] w-[calc(100vw-2rem)] origin-bottom-right sm:w-[28rem] flex-col overflow-hidden rounded-3xl border border-primary-strong bg-white shadow-xl transition-[opacity,scale,translate] motion-reduce:transition-none ${visible ? 'translate-y-0 scale-100 opacity-100 duration-200 ease-out' : 'translate-y-2 scale-95 opacity-0 duration-150 ease-in'}`}
    >
      <header className="flex items-center gap-3 bg-primary px-4 py-3">
        <ChatbotMascot size={40} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-base font-semibold text-cocoa">
            피치
          </h2>
          <p className="text-xs text-cocoa-secondary">임신 중 운동 Q&amp;A</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="채팅창 닫기"
          className="flex size-8 items-center justify-center rounded-full text-cocoa-secondary transition-colors hover:bg-primary-strong"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <p className="border-b border-primary-strong bg-primary-soft px-4 py-2 text-xs leading-snug text-cocoa-secondary">
        공식 기관 자료를 바탕으로 한 일반 정보예요. 의학적 조언이 아니며, 증상이
        있다면 담당 의료진과 상담하세요.
      </p>

      <div
        ref={listRef}
        // relative: 말풍선의 offsetTop을 이 영역 기준으로 읽기 위해 필요하다.
        className="relative flex-1 overflow-y-auto bg-primary-soft px-4 py-4"
      >
        <ul
          role="log"
          aria-label="대화 내용"
          aria-live="polite"
          className="flex flex-col gap-3"
        >
          <li className="flex items-end gap-2">
            <ChatbotMascot size={28} className="shrink-0" />
            <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-primary-strong bg-white px-3.5 py-2.5 text-[15px] leading-relaxed text-cocoa">
              {greeting} 저는 피치예요. 임신 중 운동이 궁금하면 물어보세요.
              <span className="mt-1.5 block text-xs text-cocoa-secondary">
                이전 대화는 기억하지 못해요. 궁금한 점은 한 번에 자세히 적어
                주세요.
              </span>
            </p>
          </li>
          {messages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              onTypingDone={onTypingDone}
            />
          ))}
          {pending && (
            <li className="flex items-end gap-2">
              <ChatbotMascot size={28} className="shrink-0" />
              <p
                role="status"
                className="rounded-2xl rounded-bl-md border border-primary-strong bg-white px-3.5 py-2.5 text-[15px] text-cocoa-secondary"
              >
                답변을 찾고 있어요…
              </p>
            </li>
          )}
        </ul>

        {!hasAsked && (
          <div className="mt-4 flex flex-col items-start gap-2">
            {EXAMPLE_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                disabled={pending}
                onClick={() => submit(question)}
                className="rounded-full border border-brand-text bg-white px-3.5 py-1.5 text-left text-sm text-brand-text transition-colors hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (canSend) submit(draft)
        }}
        className="flex items-center gap-2 border-t border-primary-strong bg-white px-3 py-3"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MAX_LENGTH}
          placeholder="궁금한 점을 입력하세요"
          aria-label="질문 입력"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-full border border-field bg-white px-4 py-2.5 text-[15px] placeholder:text-ink-secondary/70"
        />
        <Button type="submit" variant="brand" size="sm" disabled={!canSend}>
          보내기
        </Button>
      </form>
    </div>
  )
}

export default ChatPanel
