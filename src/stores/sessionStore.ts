import { create } from 'zustand'
import { Session } from '../types'

interface SessionState {
  activeSessions: Session[]
  setActiveSessions: (sessions: Session[]) => void
  addSession: (session: Session) => void
  updateSession: (session: Session) => void
  removeSession: (sessionId: string) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSessions: [],
  setActiveSessions: (sessions) => set({ activeSessions: sessions }),
  addSession: (session) =>
    set((state) => ({ activeSessions: [session, ...state.activeSessions] })),
  updateSession: (session) =>
    set((state) => ({
      activeSessions: state.activeSessions.map((s) =>
        s.id === session.id ? session : s
      ),
    })),
  removeSession: (sessionId) =>
    set((state) => ({
      activeSessions: state.activeSessions.filter((s) => s.id !== sessionId),
    })),
}))
