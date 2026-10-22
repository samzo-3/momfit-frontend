import { useRef, useState } from 'react'
import { useTransitionState } from '../../../shared/lib/useTransitionState'
import { useChat } from '../hooks/useChat'
import ChatbotMascot from './ChatbotMascot'
import ChatPanel from './ChatPanel'

// 나가는 애니메이션(duration-150)이 끝난 뒤에 제거한다.
const EXIT_MS = 150

interface ChatWidgetProps {
  // 인사에 쓴다. 없으면 이름 없이 인사한다.
  nickname?: string
}

// 화면 오른쪽 아래에 떠 있는 챗봇 캐릭터와 "물어보기" 라벨. 누르면 채팅창이 열린다.
// 대화는 이 위젯이 들고 있으므로 창을 닫았다 열어도 이어지고, 화면을 벗어나면 사라진다.
function ChatWidget({ nickname }: ChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const { mounted, visible } = useTransitionState(open, EXIT_MS)
  const { messages, send, pending, finishTyping, settleTyping } = useChat()
  const launcherRef = useRef<HTMLButtonElement>(null)

  function close() {
    settleTyping()
    setOpen(false)
    launcherRef.current?.focus()
  }

  return (
    <>
      {mounted && (
        <ChatPanel
          open={open}
          visible={visible}
          nickname={nickname}
          messages={messages}
          pending={pending}
          onSend={send}
          onTypingDone={finishTyping}
          onClose={close}
        />
      )}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? '채팅창 닫기' : '피치에게 물어보기'}
        aria-expanded={open}
        aria-controls={mounted ? 'chatbot-panel' : undefined}
        title="피치에게 물어보기"
        className="group fixed right-4 bottom-4 z-40 flex flex-col items-center gap-1"
      >
        <span className="flex size-16 items-center justify-center rounded-full border border-primary-strong bg-primary shadow-lg transition-transform group-hover:scale-105 group-active:scale-95 motion-reduce:transition-none">
          <ChatbotMascot
            size={44}
            className="animate-mascot-float motion-reduce:animate-none"
          />
        </span>
        {/* 보이는 글자는 접근성 이름(aria-label)에 그대로 들어 있다. 열려 있을 때는 "닫기"로 바꿔 자리가 흔들리지 않게 한다. */}
        <span className="rounded-full border border-primary-strong bg-white px-2.5 py-0.5 text-xs font-medium text-brand-text shadow-sm">
          {open ? '닫기' : '물어보기'}
        </span>
      </button>
    </>
  )
}

export default ChatWidget
