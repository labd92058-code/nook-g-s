import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { Cafe, Staff } from '../types'

interface AuthState {
  type: 'owner' | 'staff' | null
  owner: User | null
  staff: Staff | null
  cafe: Cafe | null
  isLoading: boolean
  setOwner: (user: User | null) => void
  setStaff: (staff: Staff | null) => void
  setCafe: (cafe: Cafe | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  type: null,
  owner: null,
  staff: null,
  cafe: null,
  isLoading: true,
  setOwner: (user) => set({ owner: user, type: user ? 'owner' : null }),
  setStaff: (staff) => set({ staff, type: staff ? 'staff' : null }),
  setCafe: (cafe) => set({ cafe }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => {
    localStorage.removeItem('nook_staff_session')
    set({ type: null, owner: null, staff: null, cafe: null })
  },
}))
