import { Bell, LogOut, User } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { GlobalSearch } from './GlobalSearch'

export const TopBar = () => {
  const { type, owner, staff, cafe, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (type === 'owner') {
      await supabase.auth.signOut()
    }
    logout()
    navigate('/login')
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-bg/90 backdrop-blur-xl border-b border-border z-[100] flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {type === 'owner' ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white font-bold text-[10px]">N</div>
            <span className="text-sm font-bold text-text">Nook OS</span>
          </div>
        ) : (
          <span className="text-sm font-semibold text-text">{cafe?.name}</span>
        )}
      </div>

      <div className="text-[11px] font-medium text-text3 uppercase tracking-wider">
        {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
      </div>

      <div className="flex items-center gap-1">
        <GlobalSearch />
        {type === 'owner' ? (
          <>
            <button className="relative p-2 text-text3 hover:text-text transition-colors">
              <Bell size={18} />
              <div className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-bg" />
            </button>
            <div className="ml-2">
              <Avatar name={owner?.user_metadata?.full_name || 'Owner'} size="sm" />
            </div>
          </>
        ) : (
          <button 
            onClick={handleLogout}
            className="p-2 text-text3 hover:text-error transition-colors"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  )
}
