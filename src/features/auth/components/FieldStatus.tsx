import InfoTip from '../../../shared/components/InfoTip'
import StatusIcon from '../../../shared/components/StatusIcon'

interface FieldStatusProps {
  // 입력칸 이름. 스크린리더용 이름에 쓴다.
  label: string
  // 있으면 빨간 느낌표 아이콘과 그 오른쪽 툴팁으로 사유를 보여준다.
  error?: string | null
  // 오류가 없고 값이 올바르면 초록 체크를 보여준다.
  valid: boolean
}

// 입력칸 안 오른쪽에 두는 검증 결과. 아이디 칸과 같은 모양으로 통일한다.
// 오류가 새로 나타나면(문구가 바뀌면) 툴팁이 3초간 자동으로 열린다.
function FieldStatus({ label, error, valid }: FieldStatusProps) {
  if (error) {
    return (
      <InfoTip
        key={error}
        variant="error"
        label={`${label} 오류 사유`}
        text={error}
        autoOpenFor={3000}
      />
    )
  }
  if (!valid) return null
  return (
    <>
      <StatusIcon kind="success" />
      <span role="status" className="sr-only">
        {label} 형식이 올바릅니다.
      </span>
    </>
  )
}

export default FieldStatus
