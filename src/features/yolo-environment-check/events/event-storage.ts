import type { EnvironmentSession } from './event-types'

/** 개발 Vite 서버에 종료된 세션 하나를 한 번만 저장한다. 영상·이미지 데이터는 보내지 않는다. */
export async function saveEnvironmentSession(session: EnvironmentSession) {
  const response = await fetch('/__dev/yolo-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  })
  if (!response.ok) throw new Error(`EVENT_SAVE_${response.status}`)
  return (await response.json()) as { saved: boolean; path?: string }
}
