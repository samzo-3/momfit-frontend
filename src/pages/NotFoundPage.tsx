import ButtonLink from '../shared/components/ButtonLink'

function NotFoundPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-4 bg-primary-soft px-4 py-24 text-center">
      <p aria-hidden="true" className="text-6xl font-semibold text-brand-text">
        404
      </p>
      <h1 className="text-4xl font-semibold text-cocoa">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="text-[17px] text-cocoa-secondary">
        주소가 바뀌었거나 없는 페이지예요.
      </p>
      <ButtonLink to="/" variant="brand" className="mt-4">
        홈으로 돌아가기
      </ButtonLink>
    </main>
  )
}

export default NotFoundPage
