// 모든 화면 하단에 보이는 안내. 왼쪽에는 서비스 소개 한 줄, 오른쪽에는 의학적 면책 문구를 둔다.
// 면책 문구는 넓은 화면(lg 이상)에서 한 줄로 보인다. 그보다 좁으면 소개 아래로 내려오고, 아주 좁으면 자연스럽게 줄이 바뀐다.
// 운동 서비스이므로 면책 문구는 항상 함께 노출한다.
function SiteFooter() {
  return (
    <footer className="border-t border-primary-strong bg-primary-soft px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <p className="flex items-center gap-2.5 text-[15px] text-cocoa-secondary">
          <strong className="text-lg font-semibold tracking-tight text-cocoa">
            momfit
          </strong>
          <span aria-hidden="true" className="text-primary-strong">
            •
          </span>
          안전하고 따뜻한 임산부 맞춤 운동 솔루션
        </p>
        <p className="text-xs text-cocoa-secondary lg:text-right lg:whitespace-nowrap">
          momfit은 의학적 진단이나 치료를 대신하지 않습니다. 운동을 시작하기
          전에 담당 전문의와 상담하세요.
        </p>
      </div>
    </footer>
  )
}

export default SiteFooter
