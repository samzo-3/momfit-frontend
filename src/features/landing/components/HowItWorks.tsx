const STEPS = [
  {
    title: '가입하고 정보 입력',
    description: '출산 예정일과 운동 경험을 알려 주세요.',
  },
  {
    title: '운동 고르기',
    description: '오늘 컨디션에 맞는 운동을 선택해요.',
  },
  {
    title: '자세 확인하며 따라하기',
    description: '화면 안내에 맞춰 천천히 움직여요.',
  },
]

function HowItWorks() {
  return (
    <section
      aria-labelledby="landing-steps-title"
      className="bg-white px-4 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <h2
          id="landing-steps-title"
          className="text-center text-4xl font-semibold text-cocoa sm:text-5xl"
        >
          이렇게 시작해요
        </h2>
        <ol className="mt-12 grid gap-10 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col items-center text-center"
            >
              <span
                aria-hidden="true"
                className="text-6xl font-semibold text-brand-text"
              >
                {index + 1}
              </span>
              <h3 className="mt-3 text-2xl font-semibold text-cocoa">
                {step.title}
              </h3>
              <p className="mt-2 text-[17px] text-cocoa-secondary">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default HowItWorks
