function LoadingScreen() {
  return (
    // 살구색 화면으로 이어지는 로딩이라 같은 바탕으로 채운다. (회색이 번쩍이지 않게)
    <p
      role="status"
      className="flex-1 bg-primary-soft p-12 text-center text-cocoa-secondary"
    >
      불러오는 중...
    </p>
  )
}

export default LoadingScreen
