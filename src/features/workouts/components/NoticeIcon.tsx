// 운동 고르기·준비 화면의 안내 박스 앞에 두는 느낌표 아이콘. 의미는 옆 문구가 전한다.
function NoticeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0 text-brand-text"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  )
}

export default NoticeIcon
