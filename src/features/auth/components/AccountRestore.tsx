import { useRestoreAccount, useRestoreInfo } from '../hooks/useAuthMutations'
import { errorMessage } from '../form-errors'
import { formatDateTime } from '../format'
import Button from '../../../shared/components/Button'
import ButtonLink from '../../../shared/components/ButtonLink'
import LoadingScreen from '../../../shared/components/LoadingScreen'
import Notice from '../../../shared/components/Notice'
import TextLink from '../../../shared/components/TextLink'

// 탈퇴 유예 중인 계정이 로그인하면(아이디·카카오) 이 화면으로 온다.
// 유예 기간 안에는 복구할 수 있고, 복구하지 않으면 삭제 예정일에 모든 정보가 지워진다.
function AccountRestore() {
  const info = useRestoreInfo()
  const restore = useRestoreAccount()

  if (info.isPending) return <LoadingScreen />

  // 복구용 쿠키가 없거나 만료됐고, 이미 삭제됐거나 복구 기간이 지난 경우도 여기로 온다.
  if (info.isError) {
    return (
      <div className="flex flex-col gap-5 text-center">
        <Notice kind="error">{errorMessage(info.error)}</Notice>
        <TextLink to="/login" tone="brand" className="text-[17px]">
          로그인으로 돌아가기
        </TextLink>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[17px] text-cocoa">
        <strong className="font-semibold">
          {formatDateTime(info.data.purgeAt)}
        </strong>
        까지 계정을 복구할 수 있어요. 그 이후에는 계정과 건강정보가 모두
        삭제되고 되돌릴 수 없어요.
      </p>
      <p className="text-[15px] text-cocoa-secondary">
        {formatDateTime(info.data.withdrawnAt)}에 탈퇴하셨어요. 복구하면 탈퇴
        전과 같은 정보로 바로 이용할 수 있어요.
      </p>

      {restore.isError && (
        <Notice kind="error">{errorMessage(restore.error)}</Notice>
      )}
      <div className="flex flex-col gap-3">
        <Button
          variant="brand"
          fullWidth
          disabled={restore.isPending}
          onClick={() => restore.mutate()}
        >
          {restore.isPending ? '복구 중...' : '계정 복구하기'}
        </Button>
        <ButtonLink to="/" variant="brand-outline" className="w-full">
          복구하지 않기
        </ButtonLink>
      </div>
    </div>
  )
}

export default AccountRestore
