export const SESSION_COOKIE_NAME = 'ibl_project_id'

export function generateProjectId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `proj-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

export function setSessionProjectCookie(projectId: string): void {
  if (typeof document === 'undefined') return
  const maxAgeSeconds = 60 * 60 * 8
  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(projectId)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`
}

export function getSessionProjectCookie(): string | null {
  if (typeof document === 'undefined') return null

  const entry = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`))

  if (!entry) return null

  return decodeURIComponent(entry.slice(`${SESSION_COOKIE_NAME}=`.length))
}

export function clearSessionProjectCookie(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`
}