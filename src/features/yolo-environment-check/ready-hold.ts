import { ENVIRONMENT_CHECK_CONFIG } from './environment-policy'

export class ReadyHoldTracker {
  private startedAt: number | null = null
  update(ready: boolean, now: number) {
    if (!ready) {
      this.startedAt = null
      return { elapsedMs: 0, completed: false }
    }
    if (this.startedAt === null) this.startedAt = now
    const elapsedMs = now - this.startedAt
    return {
      elapsedMs,
      completed: elapsedMs >= ENVIRONMENT_CHECK_CONFIG.holdMs,
    }
  }
  reset() {
    this.startedAt = null
  }
}
