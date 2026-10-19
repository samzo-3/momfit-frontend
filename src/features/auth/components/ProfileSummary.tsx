import type { User } from '../types'

// 넓은 화면에서만 보이는 요약 카드. 좁은 화면에서는 숨겨 기존 화면과 같게 둔다.
function ProfileSummary({ user }: { user: User }) {
  const initial = Array.from(user.nickname)[0] ?? ''

  return (
    <aside
      aria-label="프로필 요약"
      className="hidden flex-col items-center gap-3 rounded-3xl bg-white p-8 text-center shadow-sm lg:flex"
    >
      <div
        aria-hidden="true"
        className="grid size-20 place-items-center rounded-full bg-accent text-3xl font-semibold text-white"
      >
        {initial}
      </div>
      <p className="text-2xl font-semibold">{user.nickname}</p>
      {user.pregnancyWeek !== null && (
        <p className="text-[17px] text-accent">임신 {user.pregnancyWeek}주차</p>
      )}
      <p className="text-sm break-all text-ink-secondary">
        {user.email ?? '카카오 계정'}
      </p>
    </aside>
  )
}

export default ProfileSummary
