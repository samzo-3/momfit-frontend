import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <main>
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <Link to="/">홈으로 돌아가기</Link>
    </main>
  )
}

export default NotFoundPage
