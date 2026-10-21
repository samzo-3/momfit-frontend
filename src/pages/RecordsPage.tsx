import { RecordsView } from '../features/records'

// 내 운동 기록 캘린더. 날짜를 고르면 오른쪽에 그 날의 요약 리포트가 들어올 예정이다.
function RecordsPage() {
  return (
    <main className="flex-1 bg-primary-soft px-4 py-10 sm:py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col items-start gap-3">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-brand-text">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-brand"
            />
            오늘도 한 걸음
          </p>
          <h1 className="text-4xl font-semibold text-cocoa">나의 운동 기록</h1>
          <p className="text-[15px] text-cocoa-secondary">
            잘한 날도 쉬어간 날도, 나에게 맞는 속도로 쌓아가는 기록이에요.
          </p>
        </header>
        <RecordsView />
      </div>
    </main>
  )
}

export default RecordsPage
