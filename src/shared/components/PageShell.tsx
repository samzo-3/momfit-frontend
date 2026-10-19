import type { ReactNode } from 'react'

interface PageShellProps {
  title: string
  description?: string
  // 넓은 화면(lg 이상)에서 가로로 넓히고 제목을 왼쪽에 둔다. 카드는 children이 직접 만든다.
  // 좁은 화면에서는 기본과 똑같이 보인다.
  wide?: boolean
  children: ReactNode
}

// 큰 제목과 한 줄 설명 아래에 흰 카드를 두는 화면 틀 (회색 배경은 전체 화면에 깐다).
function PageShell({ title, description, wide, children }: PageShellProps) {
  return (
    <main className="bg-surface px-4 py-12 sm:py-16">
      <div
        className={`mx-auto flex w-full max-w-md flex-col gap-8 ${wide ? 'lg:max-w-5xl' : ''}`}
      >
        <header
          className={`flex flex-col gap-2 text-center ${wide ? 'lg:text-left' : ''}`}
        >
          <h1 className="text-4xl font-semibold">{title}</h1>
          {description && (
            <p className="text-[17px] text-ink-secondary">{description}</p>
          )}
        </header>
        <div
          className={`rounded-3xl bg-white p-6 shadow-sm sm:p-8 ${wide ? 'lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none' : ''}`}
        >
          {children}
        </div>
      </div>
    </main>
  )
}

export default PageShell
