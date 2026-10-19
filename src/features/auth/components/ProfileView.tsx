import Button from '../../../shared/components/Button'
import Notice from '../../../shared/components/Notice'
import { exerciseLevelLabel } from '../exercise-levels'
import { formatDate } from '../format'
import type { User } from '../types'

interface ProfileViewProps {
  user: User
  onEdit: () => void
  // 수정을 마치고 돌아왔을 때 보여줄 안내
  notice?: string | null
  // 수정에서 돌아온 경우 "수정하기" 버튼으로 포커스를 돌려준다.
  focusEditButton?: boolean
}

// 내 정보를 읽기 전용으로 보여준다. 수정은 "수정하기"를 눌러야 시작한다.
function ProfileView({
  user,
  onEdit,
  notice,
  focusEditButton,
}: ProfileViewProps) {
  const rows: { label: string; value: string }[] = [
    user.provider === 'local'
      ? { label: '아이디', value: user.loginId ?? '-' }
      : { label: '로그인 방식', value: '카카오' },
    ...(user.email ? [{ label: '이메일', value: user.email }] : []),
    { label: '닉네임', value: user.nickname },
    { label: '출산 예정일', value: formatDate(user.dueDate) },
    ...(user.pregnancyWeek !== null
      ? [{ label: '임신 주차', value: `${user.pregnancyWeek}주차` }]
      : []),
    { label: '운동 경험', value: exerciseLevelLabel(user.exerciseLevel) },
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
      {notice && (
        <div className="lg:col-span-2">
          <Notice kind="success">{notice}</Notice>
        </div>
      )}
      <h2 className="hidden text-xl font-semibold lg:col-start-1 lg:row-start-2 lg:block">
        기본 정보
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-[15px] lg:col-span-2 lg:row-start-3 lg:block lg:divide-y lg:divide-line lg:text-[17px]">
        {rows.map((row) => (
          <div
            key={row.label}
            className="contents lg:grid lg:grid-cols-[10rem_1fr] lg:gap-6 lg:py-4"
          >
            <dt className="text-ink-secondary">{row.label}</dt>
            <dd className="break-all">{row.value}</dd>
          </div>
        ))}
      </dl>
      <Button
        variant="secondary"
        fullWidth
        onClick={onEdit}
        autoFocus={focusEditButton}
        className="lg:col-start-2 lg:row-start-2 lg:w-auto"
      >
        수정하기
      </Button>
    </div>
  )
}

export default ProfileView
