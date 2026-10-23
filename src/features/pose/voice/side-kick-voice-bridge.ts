import type { SideKickRuntimeSnapshot } from '../analyzers/sideKick/side-kick-study-runtime'
import {
  SideKickVoicePolicy,
  type SideKickVoiceDecision,
} from './side-kick-voice-policy'

export class SideKickVoiceBridge {
  private readonly policy = new SideKickVoicePolicy()
  private lastTimestamp: number | null = null

  reset(): void {
    this.policy.reset()
    this.lastTimestamp = null
  }

  update(
    timestampMs: number,
    snapshot: SideKickRuntimeSnapshot,
  ): SideKickVoiceDecision[] {
    if (
      !Number.isFinite(timestampMs) ||
      timestampMs < 0 ||
      (this.lastTimestamp !== null && timestampMs <= this.lastTimestamp)
    ) {
      return []
    }

    this.lastTimestamp = timestampMs

    const decision = this.policy.update(timestampMs, snapshot)

    if (snapshot.flow.completed) {
      return decision ? [decision] : []
    }

    // PASS/NON_PASS records are persisted by the runtime but are not coaching
    // cues. In particular, a lift PASS already advances flow to return STEP,
    // whose start cue is the single return instruction.
    return decision ? [decision] : []
  }
}
