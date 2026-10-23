import { describe, expect, it, vi } from 'vitest'
import {
  ensureTrainerVideoMuted,
  playTrainerVideo,
  shouldPlayTrainer,
  trainerVideoSource,
} from './sideKickTrainerVideo'

describe('SideKickExerciseScreen trainer video transition', () => {
  it('가이드 종료 뒤 본 운동 영상을 선택한다', () => {
    expect(trainerVideoSource('GUIDE')).toBe('/videos/sidekick/guide.mp4')
    expect(trainerVideoSource('STARTING')).toBe(
      '/videos/sidekick/exercise-10sets.mp4',
    )
    expect(trainerVideoSource('EXERCISE')).toBe(
      '/videos/sidekick/exercise-10sets.mp4',
    )
  })

  it('가이드와 본 운동 영상을 재생 가능 상태가 된 뒤에만 자동 재생한다', () => {
    expect(shouldPlayTrainer('GUIDE', 'NONE', false)).toBe(false)
    expect(shouldPlayTrainer('GUIDE', 'NONE', true)).toBe(true)
    expect(shouldPlayTrainer('EXERCISE', 'NONE', false)).toBe(false)
    expect(shouldPlayTrainer('EXERCISE', 'NONE', true)).toBe(true)
    expect(shouldPlayTrainer('EXERCISE', 'MANUAL', true)).toBe(false)
  })

  it('재생 Promise 거부를 처리해 사용자 재시도를 허용한다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const video = {
      defaultMuted: false,
      muted: false,
      play: vi.fn().mockRejectedValue(new Error('autoplay blocked')),
    }

    await expect(playTrainerVideo(video)).resolves.toBe(false)
    expect(video.play).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('재생 직전에도 트레이너 DOM 음소거 속성을 강제한다', async () => {
    const video = {
      defaultMuted: false,
      muted: false,
      play: vi.fn().mockResolvedValue(undefined),
    }

    await expect(playTrainerVideo(video)).resolves.toBe(true)
    expect(video).toMatchObject({ defaultMuted: true, muted: true })
    expect(video.play).toHaveBeenCalledOnce()
  })

  it('source 교체 뒤에도 DOM 음소거 속성을 다시 적용할 수 있다', () => {
    const guide = { defaultMuted: false, muted: false }
    const exercise = { defaultMuted: false, muted: false }

    ensureTrainerVideoMuted(guide)
    ensureTrainerVideoMuted(exercise)

    expect(guide).toMatchObject({ defaultMuted: true, muted: true })
    expect(exercise).toMatchObject({ defaultMuted: true, muted: true })
  })
})
