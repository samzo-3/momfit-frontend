import type { SideKickVoiceDecision } from './side-kick-voice-policy'

export type VoiceClip = {
  audioUrl: string
}

export interface VoiceAudio {
  src: string
  onended: ((event: Event) => void) | null
  onerror: ((event: Event) => void) | null
  play(): Promise<void>
  pause(): void
  currentTime: number
  duration: number
  volume: number
}

export type VoiceClipResolver = (
  decision: SideKickVoiceDecision,
) => VoiceClip | null

export type VoiceAudioFactory = () => VoiceAudio

const STEP_START_CODES = new Set<SideKickVoiceDecision['eventCode']>([
  'SK_READY_START',
  'SK_LEFT_LIFT_START',
  'SK_LEFT_RETURN',
  'SK_RIGHT_LIFT_START',
  'SK_RIGHT_RETURN',
])

export const SIDE_KICK_VOICE_FADE_OUT_MS = 200
export const SIDE_KICK_VOICE_COMPLETION_DEFER_MS = 600

export class SideKickVoicePlayer {
  private readonly resolver: VoiceClipResolver
  private readonly createAudio: VoiceAudioFactory
  private queue: SideKickVoiceDecision[] = []
  private active: VoiceAudio | null = null
  private activeDecision: SideKickVoiceDecision | null = null
  private activePlayback: Promise<void> | null = null
  private generation = 0
  private disposed = false
  private completedAccepted = false
  private fadeTimers: ReturnType<typeof setTimeout>[] = []

  constructor(
    resolver: VoiceClipResolver,
    createAudio: VoiceAudioFactory = () => new Audio(),
  ) {
    this.resolver = resolver
    this.createAudio = createAudio
  }

  enqueue(decisions: SideKickVoiceDecision[]): void {
    if (this.disposed || decisions.length === 0) return

    const completed = decisions.find(
      (d) => d.eventCode === 'SK_STUDY_COMPLETED',
    )

    if (completed && !this.completedAccepted) {
      this.completedAccepted = true
      if (this.canFinishShortReturnCue()) {
        this.queue = [completed]
        return
      }
      this.replaceActiveAndQueue(completed)
      return
    }
    if (this.completedAccepted) return

    const starts = decisions.filter((d) => STEP_START_CODES.has(d.eventCode))

    if (starts.length > 0) {
      this.transitionToStep(starts[starts.length - 1])
      return
    }

    const urgent = decisions.find((d) => d.eventCode === 'SK_TRACKING_LOST')

    if (urgent) {
      this.replaceActiveAndQueue(urgent)
      return
    }

    for (const decision of decisions) {
      if (
        this.activeDecision?.eventCode === decision.eventCode &&
        this.activeDecision.step === decision.step
      ) {
        continue
      }

      if (
        this.queue.some(
          (item) =>
            item.eventCode === decision.eventCode &&
            item.step === decision.step,
        )
      ) {
        continue
      }

      // Coaching that arrives while another cue is speaking is stale by the
      // time it could play, so do not maintain a general-coaching queue.
      if (this.active) continue
      this.queue = [decision]
    }

    this.playNext()
  }

  /**
   * Starts a real STEP cue directly from a user gesture. This keeps Safari's
   * media-autoplay permission on the same Audio object used for all coaching.
   */
  activate(decision: SideKickVoiceDecision): Promise<void> {
    if (this.disposed) return Promise.reject(new Error('VOICE_PLAYER_DISPOSED'))

    this.enqueue([decision])
    return this.activePlayback ?? Promise.resolve()
  }

  stop(): void {
    this.generation++
    this.clearFadeTimers()
    this.queue = []

    const audio = this.active
    this.active = null
    this.activeDecision = null
    this.activePlayback = null

    if (audio) {
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.currentTime = 0
    }
  }

  dispose(): void {
    this.stop()
    this.disposed = true
  }

  get pendingCount(): number {
    return this.queue.length
  }

  get currentEventCode(): string | null {
    return this.activeDecision?.eventCode ?? null
  }

  private playNext(): void {
    if (this.active || this.disposed) return

    while (this.queue.length > 0) {
      const decision = this.queue.shift()!
      let clip: VoiceClip | null

      try {
        clip = this.resolver(decision)
      } catch {
        continue
      }

      if (!clip?.audioUrl) continue

      let audio: VoiceAudio
      try {
        audio = this.createAudio()
        audio.src = clip.audioUrl
      } catch {
        continue
      }

      const generation = ++this.generation
      this.active = audio
      this.activeDecision = decision

      const finish = () => {
        if (this.generation !== generation || this.active !== audio) {
          return
        }

        audio.onended = null
        audio.onerror = null
        this.active = null
        this.activeDecision = null
        this.activePlayback = null
        this.playNext()
      }

      audio.onended = finish
      audio.onerror = finish

      try {
        const playback = audio.play()
        this.activePlayback = playback
        void playback.catch(finish)
      } catch {
        finish()
      }

      return
    }
  }

  private replaceActiveAndQueue(decision: SideKickVoiceDecision): void {
    this.stop()
    this.queue = [decision]
    this.playNext()
  }

  private transitionToStep(decision: SideKickVoiceDecision): void {
    // Only the newest cue remains valid after a STEP change. This includes a
    // return cue: it is valid for STEP 3/5, never for the preceding lift STEP.
    this.queue = [decision]
    if (!this.active) {
      this.playNext()
      return
    }

    if (
      this.activeDecision?.eventCode === decision.eventCode &&
      this.activeDecision.step === decision.step
    ) {
      return
    }

    this.fadeOutActive()
  }

  private fadeOutActive(): void {
    const audio = this.active
    if (!audio) return

    this.clearFadeTimers()
    const generation = ++this.generation
    const initialVolume = audio.volume
    const halfFadeMs = SIDE_KICK_VOICE_FADE_OUT_MS / 2

    this.fadeTimers.push(
      setTimeout(() => {
        if (this.generation !== generation || this.active !== audio) return
        audio.volume = Math.max(0, initialVolume / 2)
      }, halfFadeMs),
      setTimeout(() => {
        if (this.generation !== generation || this.active !== audio) return
        audio.volume = 0
        audio.onended = null
        audio.onerror = null
        audio.pause()
        audio.currentTime = 0
        this.active = null
        this.activeDecision = null
        this.activePlayback = null
        this.fadeTimers = []
        this.playNext()
      }, SIDE_KICK_VOICE_FADE_OUT_MS),
    )
  }

  private clearFadeTimers(): void {
    for (const timer of this.fadeTimers) clearTimeout(timer)
    this.fadeTimers = []
  }

  private canFinishShortReturnCue(): boolean {
    const audio = this.active
    const eventCode = this.activeDecision?.eventCode
    if (
      !audio ||
      (eventCode !== 'SK_LEFT_RETURN' && eventCode !== 'SK_RIGHT_RETURN') ||
      !Number.isFinite(audio.duration) ||
      !Number.isFinite(audio.currentTime)
    ) {
      return false
    }

    return (
      audio.duration - audio.currentTime <=
      SIDE_KICK_VOICE_COMPLETION_DEFER_MS / 1000
    )
  }
}
