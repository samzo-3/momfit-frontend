import TextLink from '../shared/components/TextLink'

function NotFoundPage() {
  return (
    <main className="flex flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <TextLink to="/" className="text-[17px]">
        홈으로 돌아가기
      </TextLink>
    </main>
  )
}

export default NotFoundPage
