import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../shared/api'
import Button from '../../../shared/components/Button'
import ConfirmDialog from '../../../shared/components/ConfirmDialog'
import Notice from '../../../shared/components/Notice'
import { type MemberDetail } from '../api/members-api'
import {
  ACTION_LABELS,
  LEVEL_LABELS,
  PROVIDER_LABELS,
  formatKstDateTime,
  formatPlainDate,
} from '../format'
import {
  useMember,
  useRestoreMember,
  useWithdrawMember,
} from '../hooks/useMembers'
import StatusBadge from './StatusBadge'

const CARD = 'rounded-3xl bg-white p-6 ring-1 ring-primary-strong'

const ACTION_ERRORS: Record<string, string> = {
  MEMBER_ALREADY_WITHDRAWN: '이미 탈퇴 처리된 회원이에요.',
  MEMBER_NOT_RESTORABLE:
    '복구할 수 있는 상태가 아니에요. 유예 기간이 지났을 수 있어요.',
  MEMBER_NOT_FOUND: '회원을 찾을 수 없어요.',
}

function actionError(error: unknown): string {
  if (error instanceof ApiError && ACTION_ERRORS[error.code]) {
    return ACTION_ERRORS[error.code]
  }
  return '처리하지 못했어요. 잠시 후 다시 시도해 주세요.'
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-ink-secondary">{label}</dt>
      <dd className="text-[15px]">{children}</dd>
    </div>
  )
}

function Profile({ member }: { member: MemberDetail }) {
  return (
    <section aria-label="회원 정보" className={CARD}>
      <h2 className="mb-4 text-xl font-semibold">회원 정보</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-3">
        <Field label="상태">
          <StatusBadge status={member.status} />
        </Field>
        <Field label="이메일">{member.email ?? '-'}</Field>
        <Field label="가입 방식">
          {PROVIDER_LABELS[member.provider]}
          {member.loginId && ` (${member.loginId})`}
        </Field>
        <Field label="가입일">{formatKstDateTime(member.createdAt)}</Field>
        <Field label="마지막 방문">
          {formatPlainDate(member.lastVisitDate)}
        </Field>
        <Field label="최근 30일 방문">{member.visitDaysLast30}일</Field>
        <Field label="온보딩">
          {member.onboardingCompleted ? '완료' : '미완료'}
        </Field>
        <Field label="운동 경험">
          {member.exerciseLevel ? LEVEL_LABELS[member.exerciseLevel] : '-'}
        </Field>
        <Field label="출산 예정일">{formatPlainDate(member.dueDate)}</Field>
        <Field label="완료한 운동">{member.completedExercises}회</Field>
        {member.status === 'withdrawn' && (
          <>
            <Field label="탈퇴 요청">
              {formatKstDateTime(member.withdrawnAt)}
            </Field>
            <Field label="삭제 예정">{formatKstDateTime(member.purgeAt)}</Field>
          </>
        )}
      </dl>
    </section>
  )
}

function Records({ member }: { member: MemberDetail }) {
  return (
    <section aria-label="최근 운동 기록" className={CARD}>
      <h2 className="mb-4 text-xl font-semibold">최근 운동 기록</h2>
      {member.recentRecords.length === 0 ? (
        <p className="py-6 text-center text-[15px] text-ink-secondary">
          운동 기록이 없어요.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <caption className="sr-only">최근 운동 기록</caption>
          <thead className="text-ink-secondary">
            <tr>
              {['시작', '운동', '결과', '점수'].map((header) => (
                <th key={header} scope="col" className="py-2 pr-4 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {member.recentRecords.map((record) => (
              <tr
                key={record.startedAt + record.exerciseName}
                className="border-t border-line/60"
              >
                <td className="py-2 pr-4 tabular-nums">
                  {formatKstDateTime(record.startedAt)}
                </td>
                <td className="py-2 pr-4">{record.exerciseName}</td>
                <td className="py-2 pr-4">
                  {record.isCompleted ? '완료' : '진행 중'}
                </td>
                <td className="py-2 pr-4 tabular-nums">
                  {record.totalScore === null ? '-' : `${record.totalScore}점`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function History({ member }: { member: MemberDetail }) {
  return (
    <section aria-label="처리 이력" className={CARD}>
      <h2 className="text-xl font-semibold">처리 이력</h2>
      <p className="mb-4 text-sm text-ink-secondary">
        관리자가 이 회원을 조회하거나 처리한 기록이에요. 최근 20건까지 보여요.
      </p>
      <ul className="flex flex-col gap-2 text-sm">
        {member.history.map((entry, index) => (
          <li key={index} className="flex flex-wrap gap-x-3">
            <span className="tabular-nums text-ink-secondary">
              {formatKstDateTime(entry.createdAt)}
            </span>
            <span className="font-medium">{ACTION_LABELS[entry.action]}</span>
            <span className="text-ink-secondary">{entry.adminNickname}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Actions({ member }: { member: MemberDetail }) {
  const [confirming, setConfirming] = useState(false)
  const withdraw = useWithdrawMember()
  const restore = useRestoreMember()
  const isWithdraw = member.status === 'active'
  const mutation = isWithdraw ? withdraw : restore

  function close() {
    setConfirming(false)
    mutation.reset()
  }

  return (
    <>
      <Button
        variant={isWithdraw ? 'danger-outline' : 'brand'}
        size="sm"
        onClick={() => setConfirming(true)}
      >
        {isWithdraw ? '강제 탈퇴' : '탈퇴 복구'}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={
          isWithdraw
            ? `${member.nickname}님을 탈퇴 처리할까요?`
            : `${member.nickname}님을 복구할까요?`
        }
        description={
          isWithdraw
            ? '로그인이 모두 해제되고 탈퇴 유예 상태가 돼요. 유예 기간 안에는 복구할 수 있고, 지나면 완전히 삭제돼요.'
            : '다시 이용 중 상태로 돌아가고 바로 로그인할 수 있어요.'
        }
        confirmLabel={isWithdraw ? '강제 탈퇴' : '복구'}
        tone={isWithdraw ? 'danger' : 'default'}
        pending={mutation.isPending}
        error={mutation.isError ? actionError(mutation.error) : null}
        onConfirm={() =>
          mutation.mutate(member.id, { onSuccess: () => setConfirming(false) })
        }
        onCancel={close}
      />
    </>
  )
}

function MemberDetailView({ id }: { id: number }) {
  const member = useMember(id)

  if (member.isPending) {
    return (
      <p role="status" className="py-12 text-center text-ink-secondary">
        불러오는 중...
      </p>
    )
  }
  if (member.isError) {
    const notFound =
      member.error instanceof ApiError &&
      member.error.code === 'MEMBER_NOT_FOUND'
    return (
      <div className="flex flex-col items-start gap-3">
        <Notice kind="error">
          {notFound
            ? '회원을 찾을 수 없어요.'
            : '회원 정보를 불러오지 못했어요.'}
        </Notice>
        <Link to="/admin/members" className="text-link hover:underline">
          회원 목록으로
        </Link>
      </div>
    )
  }

  const data = member.data
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/members"
            className="text-sm text-link hover:underline"
          >
            ← 회원 목록
          </Link>
          <h2 className="text-2xl font-semibold">{data.nickname}</h2>
        </div>
        <Actions member={data} />
      </div>
      <Profile member={data} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Records member={data} />
        <History member={data} />
      </div>
    </div>
  )
}

export default MemberDetailView
