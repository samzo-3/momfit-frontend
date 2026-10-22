import { formatDate, useAuth } from '../features/auth'
import { ChatWidget } from '../features/chatbot'
import { HomeHero, HomeSummary } from '../features/home'
import { useCompletedDates } from '../features/records'
import { toDateKey, weekDates } from '../shared/lib/date'

// 운동을 고르는 화면. 아직 목록이 없어 안내 화면으로 이어진다.
const WORKOUTS_PATH = '/workouts'
const RECORDS_PATH = '/records'

// 로그인 후 첫 화면. 상단 슬라이드 히어로와 그 아래 내 요약 카드.
// features끼리는 서로 import하지 않으므로, 사용자 정보는 여기서 읽어 home에 넘긴다.
function HomePage() {
  const { user } = useAuth()
  // 이번 주(월~일)에 운동을 마친 날짜. 요약 카드의 요일 표시에 쓴다.
  const week = weekDates(new Date())
  const { dates: completedDates, isError } = useCompletedDates(
    toDateKey(week[0]),
    toDateKey(week[6]),
  )
  if (!user) return null

  return (
    <main className="flex-1 bg-primary-soft px-4 py-8 sm:py-12">
      <h1 className="sr-only">홈</h1>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <HomeHero
          nickname={user.nickname}
          pregnancyWeek={user.pregnancyWeek}
          workoutsPath={WORKOUTS_PATH}
        />
        <HomeSummary
          pregnancyWeek={user.pregnancyWeek}
          dueDate={user.dueDate}
          dueDateLabel={formatDate(user.dueDate)}
          recordsPath={RECORDS_PATH}
          completedDates={completedDates}
          loadFailed={isError}
        />
      </div>
      <ChatWidget nickname={user.nickname} />
    </main>
  )
}

export default HomePage
