// 모든 화면 하단에 보이는 안내. 왼쪽에는 서비스 소개 한 줄, 오른쪽에는 의학적 면책 문구를 둔다.
// 운동 서비스이므로 면책 문구는 항상 함께 노출한다.
function SiteFooter() {
  return (
    <footer className="border-t border-primary-strong bg-primary-soft px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
        <p className="flex items-center gap-2.5 text-[15px] text-cocoa-secondary">
          <strong className="text-lg font-semibold tracking-tight text-cocoa">
            momfit
          </strong>
          <span aria-hidden="true" className="text-primary-strong">
            •
          </span>
          안전하고 따뜻한 임산부 맞춤 운동 솔루션
        </p>
        <p className="max-w-md text-xs text-cocoa-secondary sm:text-right">
          momfit은 의학적 진단이나 치료를 대신하지 않습니다. <br />
          운동을 시작하기 전에 담당 전문의와 상담하세요.
        </p>
      </div>
    </footer>
  )
}

export default SiteFooter
