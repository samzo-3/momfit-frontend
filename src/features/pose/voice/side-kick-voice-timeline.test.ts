import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SideKickRuntimeSnapshot } from '../analyzers/sideKick/side-kick-study-runtime'
import { SideKickVoiceBridge } from './side-kick-voice-bridge'
import {
  SIDE_KICK_VOICE_FADE_OUT_MS,
  SideKickVoicePlayer,
  type VoiceAudio,
} from './side-kick-voice-player'

// ffprobe measurement of the shortened Yuna return cues.
const RETURN_CUE_DURATION_MS = 1578.005

function snapshot(
  step: 1 | 2 | 3 | 4 | 5 | null,
  events: string[] = [],
): SideKickRuntimeSnapshot {
  return {
    flow: {
      step,
      completed: step === null,
      finalResult: step === null ? 'PASS' : null,
      records: [],
      events,
      feedbackCount: 0,
    },
    baseline: null,
    readySampleCount: 0,
    lift: null,
    returning: null,
  }
}

describe('SideKickVoice timeline', () => {
  afterEach(() => vi.useRealTimers())

  it('빠른 STEP 전환에서 만료된 cue를 fade-out하고 최신 cue만 재생한다', () => {
    vi.useFakeTimers()
    const bridge = new SideKickVoiceBridge()
    const started: Array<{ code: string; at: number }> = []
    const liveAudios = new Set<VoiceAudio>()
    let now = 0
    let maxConcurrent = 0

    const player = new SideKickVoicePlayer(
      (decision) => ({ audioUrl: decision.eventCode }),
      () => {
        const audio: VoiceAudio = {
          src: '',
          onended: null,
          onerror: null,
          currentTime: 0,
          duration: Number.NaN,
          volume: 1,
          play: async () => {
            started.push({ code: audio.src, at: now })
            liveAudios.add(audio)
            maxConcurrent = Math.max(maxConcurrent, liveAudios.size)
          },
          pause: () => liveAudios.delete(audio),
        }
        return audio
      },
    )

    const emit = (timestamp: number, state: SideKickRuntimeSnapshot) => {
      now = timestamp
      player.enqueue(bridge.update(timestamp, state))
    }

    const finishFadeAt = (target: number) => {
      now = target
      vi.advanceTimersByTime(SIDE_KICK_VOICE_FADE_OUT_MS)
    }

    emit(0, snapshot(1))
    emit(2000, snapshot(2, ['STEP_1_PASS']))
    finishFadeAt(2200)
    emit(3500, snapshot(3, ['STEP_2_PASS']))
    finishFadeAt(3700)
    emit(4700, snapshot(4, ['STEP_3_PASS']))
    finishFadeAt(4900)
    emit(6400, snapshot(5, ['STEP_4_PASS']))
    finishFadeAt(6600)
    // The next transition occurs after one second: 63% of the 1.578s return
    // cue has already played, instead of only 31% of the former 3.180s cue.
    expect(1000 / RETURN_CUE_DURATION_MS).toBeGreaterThan(0.63)
    emit(7600, snapshot(null, ['STEP_5_PASS', 'STUDY_COMPLETED']))

    expect(started).toEqual([
      { code: 'SK_READY_START', at: 0 },
      { code: 'SK_LEFT_LIFT_START', at: 2200 },
      { code: 'SK_LEFT_RETURN', at: 3700 },
      { code: 'SK_RIGHT_LIFT_START', at: 4900 },
      { code: 'SK_RIGHT_RETURN', at: 6600 },
      { code: 'SK_STUDY_COMPLETED', at: 7600 },
    ])
    expect(maxConcurrent).toBe(1)
    expect(
      started.filter((item) => item.code === 'SK_STUDY_COMPLETED'),
    ).toHaveLength(1)
    expect(liveAudios.size).toBe(1)
  })
})
