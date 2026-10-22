import { useState, type ReactNode } from 'react'
import Button from '../../../shared/components/Button'

interface ChartCardProps {
  title: string
  description?: string
  // 제목 오른쪽에 두는 핵심 수치들
  figures?: ReactNode
  chart: ReactNode
  table: ReactNode
  // 필터를 바꿔 다시 불러오는 중이면 이전 화면을 흐리게 둔다.
  refreshing?: boolean
  className?: string
}

// 차트 한 장을 담는 카드. 모든 차트는 같은 값을 보여 주는 표 보기를 함께 가진다.
function ChartCard({
  title,
  description,
  figures,
  chart,
  table,
  refreshing,
  className = '',
}: ChartCardProps) {
  const [showTable, setShowTable] = useState(false)

  return (
    <section
      aria-label={title}
      className={`flex flex-col gap-4 rounded-3xl bg-white p-6 ring-1 ring-primary-strong ${className}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-ink-secondary">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {figures}
          <Button
            variant="brand-outline"
            size="sm"
            aria-pressed={showTable}
            onClick={() => setShowTable((value) => !value)}
          >
            {showTable ? '차트로 보기' : '표로 보기'}
          </Button>
        </div>
      </header>
      <div
        className={`transition-opacity ${refreshing ? 'opacity-50' : ''}`}
        aria-busy={refreshing}
      >
        {showTable ? table : chart}
      </div>
    </section>
  )
}

export default ChartCard
