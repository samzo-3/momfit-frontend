import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SIDE_KICK_VOICE_FADE_OUT_MS,
  SIDE_KICK_VOICE_COMPLETION_DEFER_MS,
  SideKickVoicePlayer,
  type VoiceAudio,
} from './side-kick-voice-player'
import type { SideKickVoiceDecision } from './side-kick-voice-policy'

function decision(
  eventCode: SideKickVoiceDecision['eventCode'],
  step: SideKickVoiceDecision['step'] = 2,
): SideKickVoiceDecision {
  return { eventCode, step, priority: 'NORMAL' }
}

function setup() {
  const audios: VoiceAudio[] = []
  const pause = vi.fn()
  const player = new SideKickVoicePlayer(
    (item) => ({ audioUrl: `/audio/${item.eventCode}.mp3` }),
    () => {
      const audio: VoiceAudio = {
        src: '',
        onended: null,
        onerror: null,
        currentTime: 0,
        duration: Number.NaN,
        volume: 1,
        play: vi.fn().mockResolvedValue(undefined),
        pause,
      }
      audios.push(audio)
      return audio
    },
  )
  return { player, audios, pause }
}

describe('SideKickVoicePlayer', () => {
  afterEach(() => vi.useRealTimers())
  it('단일 안내를 재생한다', () => {
    const { player, audios } = setup()
    player.enqueue([decision('SK_LEFT_LIFT_START')])
    expect(audios).toHaveLength(1)
    expect(audios[0].src).toBe('/audio/SK_LEFT_LIFT_START.mp3')
  })
  it('사용자 제스처 활성화도 Player의 단일 Audio로 현재 STEP 안내를 재생한다', async () => {
    const { player, audios } = setup()

    await expect(player.activate(decision('SK_READY_START', 1))).resolves.toBe(
      undefined,
    )

    expect(audios).toHaveLength(1)
    expect(audios[0].src).toBe('/audio/SK_READY_START.mp3')
    expect(audios[0].play).toHaveBeenCalledTimes(1)
  })
  it('STEP 전환은 현재 짧은 안내를 자연스럽게 끝내고 최신 STEP만 예약한다', () => {
    vi.useFakeTimers()
    const { player, audios, pause } = setup()
    player.enqueue([decision('SK_WAIT_MOVEMENT')])
    player.enqueue([decision('SK_LEFT_RETURN', 3)])
    expect(pause).not.toHaveBeenCalled()
    expect(player.pendingCount).toBe(1)
    vi.advanceTimersByTime(SIDE_KICK_VOICE_FADE_OUT_MS)
    expect(pause).toHaveBeenCalledTimes(1)
    expect(audios[1].src).toBe('/audio/SK_LEFT_RETURN.mp3')
  })
  it('HOLD 재생 중 PASS와 다음 STEP 시작이 오면 다음 STEP만 재생한다', () => {
    vi.useFakeTimers()
    const { player, audios, pause } = setup()
    player.enqueue([decision('SK_HOLD_POSITION')])
    player.enqueue([
      decision('SK_STEP_COMPLETED', 2),
      decision('SK_LEFT_RETURN', 3),
    ])
    expect(pause).not.toHaveBeenCalled()
    expect(audios).toHaveLength(1)
    vi.advanceTimersByTime(SIDE_KICK_VOICE_FADE_OUT_MS)
    expect(audios[1].src).toBe('/audio/SK_LEFT_RETURN.mp3')
  })
  it('복귀 안내 중 다음 STEP으로 전환되면 fade-out 뒤 최신 STEP 안내만 재생한다', () => {
    vi.useFakeTimers()
    const { player, audios, pause } = setup()
    player.enqueue([decision('SK_LEFT_RETURN', 3)])
    player.enqueue([decision('SK_RIGHT_LIFT_START', 4)])
    expect(audios).toHaveLength(1)
    expect(audios[0].volume).toBe(1)
    vi.advanceTimersByTime(SIDE_KICK_VOICE_FADE_OUT_MS / 2)
    expect(audios[0].volume).toBe(0.5)
    vi.advanceTimersByTime(SIDE_KICK_VOICE_FADE_OUT_MS / 2)
    expect(pause).toHaveBeenCalledTimes(1)
    expect(audios[1].src).toBe('/audio/SK_RIGHT_LIFT_START.mp3')
  })
  it('대기 중인 복귀 안내는 더 최신 STEP 전환이 오면 재생하지 않는다', () => {
    vi.useFakeTimers()
    const { player, audios } = setup()
    player.enqueue([decision('SK_LEFT_LIFT_START', 2)])
    player.enqueue([decision('SK_LEFT_RETURN', 3)])
    player.enqueue([decision('SK_RIGHT_LIFT_START', 4)])
    vi.advanceTimersByTime(SIDE_KICK_VOICE_FADE_OUT_MS)
    expect(audios.map((audio) => audio.src)).toEqual([
      '/audio/SK_LEFT_LIFT_START.mp3',
      '/audio/SK_RIGHT_LIFT_START.mp3',
    ])
  })
  it('STEP 결과보다 다음 STEP 안내를 우선한다', () => {
    const { player, audios } = setup()
    player.enqueue([
      decision('SK_STEP_COMPLETED', 2),
      decision('SK_LEFT_RETURN', 3),
    ])
    expect(audios).toHaveLength(1)
    expect(audios[0].src).toBe('/audio/SK_LEFT_RETURN.mp3')
  })
  it('STEP 시작 안내는 일반 코칭 이벤트로 끊지 않는다', () => {
    const { player, audios, pause } = setup()
    player.enqueue([decision('SK_LEFT_LIFT_START')])
    player.enqueue([decision('SK_HOLD_POSITION')])
    expect(pause).not.toHaveBeenCalled()
    expect(player.currentEventCode).toBe('SK_LEFT_LIFT_START')
    expect(audios).toHaveLength(1)
    expect(player.pendingCount).toBe(0)
  })
  it('일반 코칭은 재생 중인 음성 뒤에 대기시키지 않는다', () => {
    const { player, audios } = setup()
    player.enqueue([decision('SK_HOLD_POSITION')])
    player.enqueue([decision('SK_WAIT_MOVEMENT')])
    expect(player.pendingCount).toBe(0)
    audios[0].onended?.(new Event('ended'))
    expect(audios).toHaveLength(1)
  })
  it('같은 일반 코칭 연속 입력은 추가 재생하지 않는다', () => {
    const { player } = setup()
    player.enqueue([decision('SK_HOLD_POSITION')])
    player.enqueue([decision('SK_WAIT_MOVEMENT')])
    player.enqueue([decision('SK_WAIT_MOVEMENT')])
    expect(player.pendingCount).toBe(0)
  })
  it('측정 오류 안내는 현재 음성을 중단한다', () => {
    const { player, audios, pause } = setup()
    player.enqueue([decision('SK_HOLD_POSITION')])
    player.enqueue([decision('SK_TRACKING_LOST')])
    expect(pause).toHaveBeenCalledTimes(1)
    expect(audios[1].src).toBe('/audio/SK_TRACKING_LOST.mp3')
  })
  it('전체 완료 시 기존 음성을 제거한다', () => {
    const { player, audios } = setup()
    player.enqueue([decision('SK_WAIT_MOVEMENT')])
    player.enqueue([decision('SK_STUDY_COMPLETED', null)])
    expect(audios[1].src).toBe('/audio/SK_STUDY_COMPLETED.mp3')
    expect(player.pendingCount).toBe(0)
  })
  it('거의 끝난 복귀 안내는 완료 안내 전에 최대 600ms까지 마무리한다', () => {
    const { player, audios, pause } = setup()
    player.enqueue([decision('SK_RIGHT_RETURN', 5)])
    audios[0].duration = 1.578
    audios[0].currentTime = 1
    player.enqueue([decision('SK_STUDY_COMPLETED', null)])
    expect(pause).not.toHaveBeenCalled()
    expect(player.pendingCount).toBe(1)
    audios[0].onended?.(new Event('ended'))
    expect(audios[1].src).toBe('/audio/SK_STUDY_COMPLETED.mp3')
    expect(SIDE_KICK_VOICE_COMPLETION_DEFER_MS).toBe(600)
  })
  it('잔여 길이가 길거나 알 수 없는 복귀 안내는 완료 시 즉시 중단한다', () => {
    const { player, audios, pause } = setup()
    player.enqueue([decision('SK_RIGHT_RETURN', 5)])
    audios[0].duration = 1.578
    audios[0].currentTime = 0.5
    player.enqueue([decision('SK_STUDY_COMPLETED', null)])
    expect(pause).toHaveBeenCalledTimes(1)
    expect(audios[1].src).toBe('/audio/SK_STUDY_COMPLETED.mp3')
  })
  it('전체 완료 이벤트가 반복되어도 한 번만 재생한다', () => {
    const { player, audios } = setup()
    player.enqueue([decision('SK_STUDY_COMPLETED', null)])
    audios[0].onended?.(new Event('ended'))
    player.enqueue([decision('SK_STUDY_COMPLETED', null)])
    expect(audios).toHaveLength(1)
  })
  it('이전 Audio의 늦은 종료 및 오류 콜백이 새 상태를 바꾸지 않는다', () => {
    const { player, audios } = setup()
    player.enqueue([decision('SK_HOLD_POSITION')])
    const oldEnded = audios[0].onended
    const oldErrored = audios[0].onerror
    player.enqueue([decision('SK_TRACKING_LOST')])
    oldEnded?.(new Event('ended'))
    oldErrored?.(new Event('error'))
    expect(player.currentEventCode).toBe('SK_TRACKING_LOST')
    expect(audios).toHaveLength(2)
  })
  it('오래된 fade-out 콜백이 긴급 안내를 바꾸지 않는다', () => {
    vi.useFakeTimers()
    const { player, audios } = setup()
    player.enqueue([decision('SK_LEFT_RETURN', 3)])
    player.enqueue([decision('SK_RIGHT_LIFT_START', 4)])
    player.enqueue([decision('SK_TRACKING_LOST', 4)])
    vi.advanceTimersByTime(SIDE_KICK_VOICE_FADE_OUT_MS)
    expect(player.currentEventCode).toBe('SK_TRACKING_LOST')
    expect(audios).toHaveLength(2)
  })
  it('일반 코칭은 동시에 재생하거나 대기열에 쌓지 않는다', () => {
    const { player, audios } = setup()
    player.enqueue([decision('SK_HOLD_POSITION')])
    player.enqueue([decision('SK_WAIT_MOVEMENT')])
    player.enqueue([decision('SK_HOLD_INTERRUPTED')])
    expect(audios).toHaveLength(1)
    expect(player.pendingCount).toBe(0)
    audios[0].onended?.(new Event('ended'))
    expect(audios).toHaveLength(1)
  })
  it('MP3 URL이 없으면 건너뛴다', () => {
    const player = new SideKickVoicePlayer(() => null)
    expect(() => player.enqueue([decision('SK_HOLD_POSITION')])).not.toThrow()
    expect(player.currentEventCode).toBeNull()
  })
  it('dispose 이후 재생하지 않는다', () => {
    const { player, audios } = setup()
    player.dispose()
    player.enqueue([decision('SK_LEFT_LIFT_START')])
    expect(audios).toHaveLength(0)
  })
})
