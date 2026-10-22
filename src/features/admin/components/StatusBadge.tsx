import type { MemberStatus } from '../api/members-api'
import { STATUS_LABELS } from '../format'

// 상태는 색만으로 전하지 않고 글자와 모양(채움/테두리)을 함께 쓴다.
function StatusBadge({ status }: { status: MemberStatus }) {
  return status === 'active' ? (
    <span className="inline-block rounded-full bg-sage-soft px-2.5 py-0.5 text-xs font-medium text-sage">
      {STATUS_LABELS.active}
    </span>
  ) : (
    <span className="inline-block rounded-full border border-danger px-2.5 py-0.5 text-xs font-medium text-danger">
      {STATUS_LABELS.withdrawn}
    </span>
  )
}

export default StatusBadge
