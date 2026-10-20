const FEATURES = [
  {
    title: '실시간 자세 분석',
    description: '웹캠을 켜면 동작을 따라 자세를 살피고, 바로 피드백을 드려요.',
  },
  {
    title: '스텝별 음성 코칭',
    description: '처음 해보는 동작도 한 단계씩, 음성 안내를 들으며 익혀요.',
  },
  {
    title: '나에게 맞춘 정보',
    description: '임신 주차와 운동 경험에 맞춰 궁금한 점을 묻고 정보를 받아요.',
  },
  {
    title: '기록과 리포트',
    description: '운동 기록과 점수를 모아 주간 변화를 한눈에 확인해요.',
  },
]

function FeatureTiles() {
  return (
    <section
      aria-labelledby="landing-features-title"
      className="bg-primary px-4 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <h2
          id="landing-features-title"
          className="text-center text-4xl font-semibold text-cocoa sm:text-5xl"
        >
          MomFit이 함께해요
        </h2>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="flex min-h-44 flex-col rounded-3xl bg-white p-8 ring-1 ring-primary-strong sm:min-h-60 sm:p-10"
            >
              <h3 className="text-3xl font-semibold text-cocoa">
                {feature.title}
              </h3>
              <p className="mt-3 text-[17px] text-cocoa-secondary">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default FeatureTiles
