export type SideKickTrainerStage =
  'GUIDE' | 'STARTING' | 'EXERCISE' | 'FINISHING' | 'DONE'

export type SideKickPauseReason = 'NONE' | 'AUTO' | 'MANUAL'

const GUIDE_URL = '/videos/sidekick/guide.mp4'
const EXERCISE_URL = '/videos/sidekick/exercise-10sets.mp4'

export function trainerVideoSource(stage: SideKickTrainerStage): string {
  return stage === 'GUIDE' ? GUIDE_URL : EXERCISE_URL
}

export function shouldPlayTrainer(
  stage: SideKickTrainerStage,
  pauseReason: SideKickPauseReason,
  trainerReady: boolean,
): boolean {
  return (
    (stage === 'GUIDE' || stage === 'EXERCISE') &&
    pauseReason === 'NONE' &&
    trainerReady
  )
}

export function ensureTrainerVideoMuted(
  video: Pick<HTMLVideoElement, 'defaultMuted' | 'muted'> | null,
): void {
  if (!video) return

  // Safari는 JSX 속성만으로 source 교체 뒤의 muted property를 보장하지 않는다.
  // 재생 전에 DOM property와 기본 속성을 함께 고정한다.
  video.defaultMuted = true
  video.muted = true
}

export async function playTrainerVideo(
  video: Pick<HTMLVideoElement, 'defaultMuted' | 'muted' | 'play'> | null,
): Promise<boolean> {
  if (!video) return false

  try {
    ensureTrainerVideoMuted(video)
    await video.play()
    return true
  } catch (error) {
    // Safari 등 자동 재생 정책으로 거부될 수 있다. 호출자는 재생 버튼을 노출한다.
    console.warn('Side Kick trainer video play failed:', error)
    return false
  }
}
