import { splitDisclaimer } from '../answer-format'
import { useTypewriter } from '../hooks/useTypewriter'
import type { ChatMessage } from '../types'
import ChatbotMascot from './ChatbotMascot'
import ChatSources from './ChatSources'

interface ChatMessageItemProps {
  message: ChatMessage
  // 타자 효과가 끝났을 때 알린다.
  onTypingDone: (id: number) => void
}

const BUBBLE =
  'max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed'

// 말풍선 하나. 사용자는 오른쪽, 피치는 왼쪽에 둔다.
function ChatMessageItem({ message, onTypingDone }: ChatMessageItemProps) {
  const { body, note } = splitDisclaimer(message.text)
  // 훅은 조건 없이 부른다. 사용자 말풍선은 효과를 쓰지 않는다.
  const typing = message.role === 'bot' && Boolean(message.typing)
  const shown = useTypewriter(body, typing, () => onTypingDone(message.id))

  if (message.role === 'user') {
    return (
      <li data-message-id={message.id} className="flex justify-end">
        <p className={`${BUBBLE} rounded-br-md bg-brand text-on-brand`}>
          {message.text}
        </p>
      </li>
    )
  }

  const isEmergency = message.kind === 'emergency'
  const isError = message.kind === 'error'

  return (
    <li data-message-id={message.id} className="flex items-end gap-2">
      <ChatbotMascot size={28} className="shrink-0" />
      <div
        // 위험 신호와 요청 실패는 놓치지 않도록 알림 영역으로 알린다.
        role={isEmergency || isError ? 'alert' : undefined}
        className={`${BUBBLE} rounded-bl-md border ${
          isEmergency
            ? 'border-danger bg-danger/5 font-medium text-danger'
            : isError
              ? 'border-line bg-surface text-ink-secondary'
              : 'border-primary-strong bg-white text-cocoa'
        }`}
      >
        <p>
          {typing ? (
            <>
              {shown}
              {/* 아직 나오지 않은 글자는 투명하게 두어 말풍선 크기가 변하지 않고, 스크린리더는 전체 문장을 읽는다. */}
              <span className="text-transparent select-none">
                {body.slice(shown.length)}
              </span>
            </>
          ) : (
            body
          )}
        </p>
        {note && (
          <p className="mt-2 text-xs font-normal text-cocoa-secondary">
            {note}
          </p>
        )}
        {message.sources && <ChatSources sources={message.sources} />}
      </div>
    </li>
  )
}

export default ChatMessageItem
