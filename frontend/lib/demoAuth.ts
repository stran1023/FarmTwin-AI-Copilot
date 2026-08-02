/**
 * Client-side storage for the demo-gate token issued by POST /demo/unlock
 * (see backend/app/services/demo_auth.py). Only relevant when the backend
 * is deployed with DEMO_PASSCODE set -- against a local backend with no
 * passcode configured, every request just goes through gate-free and this
 * token is never required.
 */

const STORAGE_KEY = "farmtwin_demo_token"

export function getDemoToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(STORAGE_KEY)
}

export function setDemoToken(token: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, token)
}

export function clearDemoToken(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}
