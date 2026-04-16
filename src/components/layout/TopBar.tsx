import { LogOut, Plus } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { GlobalSearch } from './GlobalSearch'

export const TopBar = () => {
  const { type, cafe, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (type === 'owner') {
      await supabase.auth.signOut()
    }
    logout()
    navigate('/login')
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-[100] flex items-center justify-between px-4">
      {/* Background with backdrop-blur moved to an absolute child to prevent containing block issues for fixed children */}
      <div className="absolute inset-0 bg-bg/90 backdrop-blur-xl border-b border-border -z-10" />
      
      <div className="flex items-center gap-2">
        <img src="/favicon.svg" alt="Nook OS" className="w-6 h-6 drop-shadow-sm" />
        <span className="text-sm font-bold text-text hidden sm:inline-block">Nook OS</span>
      </div>

      <div className="text-sm font-semibold text-text absolute left-1/2 -translate-x-1/2 max-w-[150px] sm:max-w-[200px] truncate text-center">
        {cafe?.name}
      </div>

      <div className="flex items-center gap-1">
        <GlobalSearch />
        <button 
          onClick={() => navigate('/sessions/new')}
          className="w-8 h-8 ml-2 flex items-center justify-center rounded-full bg-accent text-white hover:bg-accent2 transition-colors shadow-[0_2px_10px_rgba(249,115,22,0.3)]"
        >
          <Plus size={18} />
        </button>
        {type === 'staff' && (
          <button 
            onClick={handleLogout}
            className="p-2 ml-1 text-text3 hover:text-error transition-colors"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  )
}
