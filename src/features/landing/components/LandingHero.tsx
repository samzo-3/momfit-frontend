import type { ReactNode } from 'react'
import backgroundImage from '../assets/hero-bg-meditation.jpg'

// 글자가 놓이는 가운데를 감싸는 타원형 막. 가운데는 92%로 짙게 하고 바깥으로 갈수록 옅어져, 양옆의 사진이 더 잘 보인다.
// (Tailwind의 임의 값 클래스로 쓰면 이 그라디언트가 만들어지지 않아 style로 직접 지정한다)
const TEXT_SCRIM =
  'radial-gradient(ellipse 52% 72% at 50% 50%, color-mix(in srgb, var(--color-primary-soft) 92%, transparent) 45%, transparent 100%)'

// 첫 화면. 서비스가 무엇인지 한 문장으로 알리고, 다음 행동(actions)을 바로 보여준다.
// 배경에는 운동하는 모습의 사진이 아주 흐릿하게 비친다. 사진은 96px로 줄여 둔 것(약 3KB)을 크게 늘려 써서
// 흐림 효과가 따로 필요 없다. 그 위에 연한 살구색 막을 덮고(글자가 놓이는 가운데는 더 짙게), 아래로 갈수록 바탕색에 녹아든다.
function LandingHero({ actions }: { actions: ReactNode }) {
  return (
    <section
      aria-labelledby="landing-hero-title"
      className="relative isolate overflow-hidden bg-primary-soft px-4 pt-20 pb-16 text-center sm:pt-28 sm:pb-24"
    >
      <img
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 size-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-primary-soft/25"
      />
      {/* 글자가 놓이는 가운데는 막을 더 짙게 해서, 사진이 어떻게 생겼든 글자 대비를 지킨다. */}
      <div
        aria-hidden="true"
        data-testid="hero-text-scrim"
        className="absolute inset-0 -z-10"
        style={{ backgroundImage: TEXT_SCRIM }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-linear-to-b from-transparent to-primary-soft"
      />
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
