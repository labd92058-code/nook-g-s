import { create } from 'zustand'

export type Language = 'fr' | 'en' | 'ar'
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface UIState {
  language: Language
  setLanguage: (lang: Language) => void
  toasts: Toast[]
  addToast: (message: string, type: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  language: (localStorage.getItem('nook_lang') as Language) || 'fr',
  setLanguage: (lang) => {
    localStorage.setItem('nook_lang', lang)
    set({ language: lang })
  },
  toasts: [],
  addToast: (message, type, duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9)
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }))
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, duration)
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))
