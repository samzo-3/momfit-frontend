import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { prefersReducedMotion } from '../../../shared/lib/useTransitionState'
import { sendChatMessage } from '../api/chatbot-api'
import { chatErrorMessage } from '../chat-errors'
import type { ChatMessage } from '../types'

// 대화 내용은 화면(메모리)에만 둔다. 새로고침하거나 다른 화면으로 가면 사라진다.
// 서버도 이전 대화를 기억하지 않으므로, 질문마다 독립적으로 보낸다.
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const nextId = useRef(1)
  const mutation = useMutation({ mutationFn: sendChatMessage })

  function append(message: Omit<ChatMessage, 'id'>) {
    const id = nextId.current
    nextId.current += 1
    setMessages((previous) => [...previous, { ...message, id }])
  }

  // 보냈으면 true. 빈 질문이거나 답을 기다리는 중이면 보내지 않는다.
  function send(raw: string): boolean {
    const question = raw.trim()
    if (!question || mutation.isPending) return false

    append({ role: 'user', text: question })
    mutation.mutate(question, {
      onSuccess: (reply) =>
        append({
          role: 'bot',
          text: reply.answer,
          kind: reply.kind,
          sources: reply.sources,
          // 위험 신호는 한 글자도 늦지 않게 바로 보여주고, 동작 줄이기 설정이면 효과를 끈다.
          typing: reply.kind !== 'emergency' && !prefersReducedMotion(),
        }),
      onError: (error) =>
        append({ role: 'bot', text: chatErrorMessage(error), kind: 'error' }),
    })
    return true
  }

  // 한 말풍선의 타자 효과가 끝났다.
  function finishTyping(id: number) {
    setMessages((previous) =>
      previous.map((message) =>
        message.id === id && message.typing
          ? { ...message, typing: false }
          : message,
      ),
    )
  }

  // 효과가 진행 중인 말풍선을 모두 끝낸 상태로 둔다. (채팅창을 닫으면 다시 열 때 처음부터 타자를 치지 않게)
  function settleTyping() {
    setMessages((previous) =>
      previous.some((message) => message.typing)
        ? previous.map((message) => ({ ...message, typing: false }))
        : previous,
    )
  }

  return {
    messages,
    send,
    pending: mutation.isPending,
    finishTyping,
    settleTyping,
  }
}
