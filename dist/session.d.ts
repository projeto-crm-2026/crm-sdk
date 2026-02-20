import { VisitorSession } from './types';
/** Load a previously saved visitor session from localStorage. */
export declare function loadSession(): VisitorSession | null;
/** Persist a visitor session to localStorage. */
export declare function saveSession(session: VisitorSession): void;
/** Remove the stored visitor session. */
export declare function clearSession(): void;
