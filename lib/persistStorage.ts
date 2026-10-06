import type { StateStorage } from 'zustand/middleware'

export const WIZARD_STORAGE_KEY = 'ibl-step0-memory'

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    // Storage can throw in private windows or when site data is blocked.
    return fallback
  }
}

/**
 * Wizard persistence lives in localStorage (survives closing the tab) on this
 * device only - nothing here is sent to the server. Sessions saved by earlier
 * versions in sessionStorage are migrated on first read, so nobody loses work.
 */
export const wizardStorage: StateStorage = {
  getItem: (name) =>
    safe(() => {
      const current = window.localStorage.getItem(name)
      if (current !== null) return current

      const legacy = window.sessionStorage.getItem(name)
      if (legacy !== null) {
        window.localStorage.setItem(name, legacy)
        window.sessionStorage.removeItem(name)
      }
      return legacy
    }, null),
  setItem: (name, value) => safe(() => window.localStorage.setItem(name, value), undefined),
  removeItem: (name) =>
    safe(() => {
      window.localStorage.removeItem(name)
      window.sessionStorage.removeItem(name)
    }, undefined),
}

export function readPersistedWizardState<T = Record<string, unknown>>(): T | null {
  const raw = wizardStorage.getItem(WIZARD_STORAGE_KEY) as string | null
  if (!raw) return null
  try {
    return (JSON.parse(raw) as { state?: T }).state ?? null
  } catch {
    return null
  }
}
