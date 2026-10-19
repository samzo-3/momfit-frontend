import type { ReactNode } from 'react'

interface PageShellProps {
  title: string
  description?: string
  children: ReactNode
}

// 큰 제목과 한 줄 설명 아래에 흰 카드를 두는 화면 틀 (회색 배경은 전체 화면에 깐다).
function PageShell({ title, description, children }: PageShellProps) {
  return (
    <main className="bg-surface px-4 py-12 sm:py-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-4xl font-semibold">{title}</h1>
          {description && (
            <p className="text-[17px] text-ink-secondary">{description}</p>
          )}
        </header>
        <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </main>
  )
}

export default PageShell
