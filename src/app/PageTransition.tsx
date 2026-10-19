import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

// 경로가 바뀔 때마다 새 화면을 부드럽게 나타낸다. (key가 바뀌면 다시 마운트되어 애니메이션이 처음부터 재생된다)
// 같은 경로 안에서의 변화(입력, 세션 복구 후 내용 교체, 모달 등)에는 다시 재생하지 않는다.
// 나가는 화면은 애니메이션 없이 바로 사라진다. 이동이 느려지거나 겹쳐 보이는 것을 피하기 위해서다.
function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  return (
    <div
      key={pathname}
      data-page-transition=""
      className="animate-page-in motion-reduce:animate-none"
    >
      {children}
    </div>
  )
}

export default PageTransition
