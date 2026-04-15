import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { translations } from './translations'

type Language = 'fr' | 'en'

interface LanguageState {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: (localStorage.getItem('nook_lang') as Language) || 'fr',
      setLanguage: (lang) => {
        localStorage.setItem('nook_lang', lang)
        set({ language: lang })
      },
    }),
    {
      name: 'nook-language-storage',
    }
  )
)

export const useTranslation = () => {
  const { language } = useLanguageStore()
  
  const t = (key: string) => {
    const keys = key.split('.')
    let current: any = translations[language]
    
    for (const k of keys) {
      if (current[k] === undefined) {
        // Fallback to French if key missing in English
        let fallback: any = translations['fr']
        for (const fk of keys) {
          if (fallback[fk] === undefined) return key
          fallback = fallback[fk]
        }
        return fallback
      }
      current = current[k]
    }
    
    return current
  }

  return { t, language }
}
