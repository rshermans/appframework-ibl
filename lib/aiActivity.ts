/** Tiny external store that tells the UI whether an AI request is in flight (and for how long). */

export interface AiActivity {
  active: number
  startedAt: number | null
  attempt: number
  maxAttempts: number
}

const IDLE: AiActivity = { active: 0, startedAt: null, attempt: 1, maxAttempts: 1 }
let state: AiActivity = IDLE
const listeners = new Set<() => void>()

const publish = (next: AiActivity) => {
  state = next
  listeners.forEach((listener) => listener())
}

export const aiActivity = {
  get: (): AiActivity => state,
  getServerSnapshot: (): AiActivity => IDLE,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  begin(maxAttempts: number) {
    publish({ active: state.active + 1, startedAt: state.startedAt ?? Date.now(), attempt: 1, maxAttempts })
  },
  attempt(attempt: number) {
    publish({ ...state, attempt })
  },
  end() {
    const active = Math.max(0, state.active - 1)
    publish(active === 0 ? IDLE : { ...state, active })
  },
}
