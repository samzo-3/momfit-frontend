import { useAuth } from '../features/auth'

function HomePage() {
  const { user } = useAuth()

  return (
    <main className="px-4 py-20 text-center sm:py-28">
      <h1 className="text-5xl font-semibold sm:text-6xl">맘핏</h1>
      <p className="mt-3 text-2xl text-ink-secondary">
        임산부를 위한 홈트레이닝
      </p>
      {user && (
        <p className="mt-8 text-[17px]">
          {user.nickname}님
          {user.pregnancyWeek !== null && `, 임신 ${user.pregnancyWeek}주차`}
        </p>
      )}
    </main>
  )
}

export default HomePage
