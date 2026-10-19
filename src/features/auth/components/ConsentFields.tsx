import Notice from '../../../shared/components/Notice'

interface ConsentFieldsProps {
  terms: boolean
  healthData: boolean
  onTermsChange: (checked: boolean) => void
  onHealthDataChange: (checked: boolean) => void
  error?: string | null
}

// 필수 동의 두 가지. 가입 화면과 카카오 온보딩 화면이 함께 쓴다.
function ConsentFields({
  terms,
  healthData,
  onTermsChange,
  onHealthDataChange,
  error,
}: ConsentFieldsProps) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-sm font-medium">약관 동의</legend>
      <label className="flex items-start gap-3 text-[15px]">
        <input
          type="checkbox"
          checked={terms}
          onChange={(event) => onTermsChange(event.target.checked)}
          className="mt-0.5 size-5 accent-accent"
        />
        이용약관에 동의합니다. (필수)
      </label>
      <label className="flex items-start gap-3 text-[15px]">
        <input
          type="checkbox"
          checked={healthData}
          onChange={(event) => onHealthDataChange(event.target.checked)}
          className="mt-0.5 size-5 accent-accent"
        />
        건강정보(출산 예정일, 운동 경험) 수집·이용에 동의합니다. (필수)
      </label>
      {error && <Notice kind="error">{error}</Notice>}
    </fieldset>
  )
}

export default ConsentFields
