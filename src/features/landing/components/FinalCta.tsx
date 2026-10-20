import type { ReactNode } from 'react'

function FinalCta({ actions }: { actions: ReactNode }) {
  return (
    <section
      aria-labelledby="landing-cta-title"
      className="bg-primary-soft px-4 py-16 text-center sm:py-24"
    >
      <h2
        id="landing-cta-title"
        className="text-4xl font-semibold text-cocoa sm:text-5xl"
      >
        지금 시작해 보세요
      </h2>
      <p className="mt-4 text-xl text-cocoa-secondary">
        가입은 이메일 인증만 하면 끝나요.
      </p>
      <div className="mt-8 flex min-h-14 flex-wrap items-center justify-center gap-4">
        {actions}
      </div>
    </section>
  )
}

export default FinalCta
