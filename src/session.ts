import { VisitorSession } from './types';

const SESSION_KEY = 'crm_visitor_session';

/** Load a previously saved visitor session from localStorage. */
export function loadSession(): VisitorSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as VisitorSession) : null;
  } catch {
    return null;
  }
}

/** Persist a visitor session to localStorage. */
export function saveSession(session: VisitorSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage errors (e.g. private mode quota exceeded).
  }
}

/** Remove the stored visitor session. */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore.
  }
}
