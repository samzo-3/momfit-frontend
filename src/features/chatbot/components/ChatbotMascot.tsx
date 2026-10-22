interface ChatbotMascotProps {
  // 한 변의 길이(px)
  size?: number
  className?: string
}

// 챗봇 캐릭터 "피치". 굵은 외곽선의 평평한 선화 스타일이고, 옅은 복숭아빛 몸통에
// 윗부분이 살짝 갈라진 실루엣, 짧은 골, 초록 꽃받침과 새싹으로 복숭아임을 알린다.
// 그라데이션이나 id를 쓰지 않아 화면에 여러 개를 함께 그려도 겹치는 문제가 없다.
// 장식이라 스크린리더에서는 숨기고, 의미는 주변 텍스트가 전달한다.
function ChatbotMascot({ size = 40, className }: ChatbotMascotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {/* 새싹: 가는 줄기와 선으로만 그린 잎 두 장 */}
      <path
        d="M32.5 18c.2-4 .6-7 1.4-10"
        stroke="#5fae5f"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M32.6 12.2c-4-5.2-10.5-5.6-13.6-3.2 2.6 5.2 9.6 6.2 13.6 3.2z"
        stroke="#4fa352"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M33.6 9.6c1.4-5.6 7.6-8 11.4-6.2-.6 5.8-6.2 8.6-11.4 6.2z"
        stroke="#a9d65c"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* 몸통: 옅은 복숭아빛, 윗부분이 살짝 갈라진 실루엣 */}
      <path
        d="M32 21c-6-4-22-3-24 13-2 15 10 24 24 24s26-9 24-24c-2-16-18-17-24-13z"
        fill="#ffece0"
        stroke="#2f2a28"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* 오른쪽 아래의 납작한 그림자와 왼쪽 위의 하이라이트 */}
      <path
        d="M52.6 34c1 11-6 20-19.4 22.2C44.4 52.4 49.6 44 48.8 34.6z"
        fill="#ffd8c4"
      />
      <path
        d="M13.2 33c.4-4.4 3-7.8 7.2-9.2"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* 복숭아 특유의 짧은 골 */}
      <path
        d="M32 21c2.6 2.6 3.8 5.6 3.8 9"
        stroke="#2f2a28"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* 꽃받침 */}
      <path
        d="M24.5 21.5c1.6-3.6 4.4-2.4 7.5-4 3.1 1.6 5.9.4 7.5 4-4 3-11 3-15 0z"
        fill="#4e9a4f"
      />

      {/* 얼굴 */}
      <circle cx="17.5" cy="44.5" r="5.2" fill="#ff9fa0" />
      <circle cx="46.5" cy="44.5" r="5.2" fill="#ff9fa0" />
      <circle cx="24" cy="39" r="2.1" fill="#2f2a28" />
      <circle cx="40" cy="39" r="2.1" fill="#2f2a28" />
      <path
        d="M28 43.4c.4 5.4 7.6 5.4 8 0z"
        fill="#ff8d98"
        stroke="#2f2a28"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default ChatbotMascot
