import { isSafeUrl, jurisdictionLabel } from '../answer-format'
import type { ChatSource } from '../types'

interface ChatSourcesProps {
  sources: ChatSource[]
}

// 답변의 근거가 된 공식 자료 목록. 펼쳐서 확인한다.
function ChatSources({ sources }: ChatSourcesProps) {
  if (sources.length === 0) return null

  return (
    <details className="mt-3 border-t border-primary-strong pt-2 text-[13px]">
      <summary className="cursor-pointer font-medium text-brand-text">
        출처 {sources.length}개
      </summary>
      <ul className="mt-2 flex flex-col gap-2">
        {sources.map((source) => (
          <li key={source.url || source.title} className="leading-snug">
            {isSafeUrl(source.url) ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-link underline underline-offset-2"
              >
                {source.title}
              </a>
            ) : (
              <span className="font-medium">{source.title}</span>
            )}
            <span className="block text-cocoa-secondary">
              {source.publisher} · {jurisdictionLabel(source.jurisdiction)}
              {source.checkedAt && ` · ${source.checkedAt} 확인`}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}

export default ChatSources
