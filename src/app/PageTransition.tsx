import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

// 경로나 쿼리(?mode=처럼 화면 단계를 나누는 값)가 바뀔 때마다 새 화면을 부드럽게 나타낸다.
// (key가 바뀌면 다시 마운트되어 애니메이션이 처음부터 재생된다)
// 같은 경로·쿼리 안에서의 변화(입력, 세션 복구 후 내용 교체, 모달 등)에는 다시 재생하지 않는다.
// 나가는 화면은 애니메이션 없이 바로 사라진다. 이동이 느려지거나 겹쳐 보이는 것을 피하기 위해서다.
function PageTransition({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation()

  return (
    <div
      key={pathname + search}
      data-page-transition=""
      // 화면이 짧아도 푸터까지 채워, 배경색이 있는 화면 아래에 회색 띠가 생기지 않게 한다.
      className="flex flex-1 flex-col animate-page-in motion-reduce:animate-none"
    >
      {children}
    </div>
  )
}

export default PageTransition
