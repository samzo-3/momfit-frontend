import ButtonLink from '../shared/components/ButtonLink'
import PageShell from '../shared/components/PageShell'

// 운동 목록 자리. 운동이 정해지면 이 화면을 실제 목록으로 바꾼다.
function WorkoutsPage() {
  return (
    <PageShell
      title="운동 고르기"
      description="운동 목록을 준비하고 있어요."
      tone="warm"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="text-[17px] text-cocoa-secondary">
          조금만 기다려 주세요. 곧 나에게 맞는 운동을 고를 수 있어요.
        </p>
        <ButtonLink to="/home" variant="brand-outline">
          홈으로
        </ButtonLink>
      </div>
    </PageShell>
  )
}

export default WorkoutsPage
