import type { UssdSession } from './ussd'

// In-memory USSD sessions keyed by sessionId. Fine for a single-server demo;
// production would use Redis / the telco session.
const g = globalThis as unknown as { ussdSessions?: Map<string, UssdSession> }
export const sessions: Map<string, UssdSession> = g.ussdSessions ?? new Map()
g.ussdSessions = sessions
