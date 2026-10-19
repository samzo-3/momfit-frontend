// 모든 화면 하단에 보이는 안내. 운동 서비스이므로 의학적 면책 문구를 항상 함께 노출한다.
function SiteFooter() {
  return (
    <footer className="border-t border-line/60 bg-surface px-4 py-8">
      <p className="mx-auto max-w-5xl text-xs text-ink-secondary">
        맘핏은 의학적 진단이나 치료를 대신하지 않습니다. 운동을 시작하기 전에
        담당 전문의와 상담하세요.
      </p>
    </footer>
  )
}

export default SiteFooter
