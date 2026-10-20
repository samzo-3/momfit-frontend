import type { ReactNode } from 'react'

// 첫 화면. 서비스가 무엇인지 한 문장으로 알리고, 다음 행동(actions)을 바로 보여준다.
function LandingHero({ actions }: { actions: ReactNode }) {
  return (
    <section
      aria-labelledby="landing-hero-title"
      className="bg-primary-soft px-4 pt-20 pb-16 text-center sm:pt-28 sm:pb-24"
    >
      <p className="text-[19px] font-medium text-brand-text">
        임산부를 위한 홈트레이닝
      </p>
      <h1
        id="landing-hero-title"
        className="mx-auto mt-3 max-w-3xl text-5xl leading-[1.1] font-semibold text-balance text-cocoa sm:text-7xl"
      >
        임신 중에도,
        <br />
        집에서 가볍게.
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-xl text-balance text-cocoa-secondary">
        웹캠으로 자세를 살피고 한 단계씩 알려주는 홈트레이닝, momfit.
      </p>
      {/* 로그인 상태가 정해지기 전에도 높이를 비워 두어 화면이 흔들리지 않게 한다. */}
      <div className="mt-10 flex min-h-14 flex-wrap items-center justify-center gap-4">
        {actions}
      </div>
    </section>
  )
}

export default LandingHero
