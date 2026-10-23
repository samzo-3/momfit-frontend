// 브라우저 전체 화면. 화면 이동(SPA)이 있어도 유지되도록 문서 전체(<html>)에 건다.
// 사용자 클릭 직후에만 허용되고, 지원하지 않는 브라우저(iPhone Safari 등)나 거절은 조용히 무시한다.
export function isFullscreen(): boolean {
  return document.fullscreenElement != null
}

export async function enterFullscreen(): Promise<void> {
  const root = document.documentElement
  if (!root.requestFullscreen || isFullscreen()) return
  try {
    await root.requestFullscreen()
  } catch {
    // 거절돼도 운동 화면은 꽉 찬 레이아웃으로 보인다.
  }
}

export async function exitFullscreen(): Promise<void> {
  if (!isFullscreen()) return
  try {
    await document.exitFullscreen()
  } catch {
    // 이미 해제된 경우 등은 무시한다.
  }
}
