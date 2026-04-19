import { Link, useLocation } from 'react-router-dom'
import { Home, Timer, Users, Settings } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from '../../i18n'
import { motion } from 'motion/react'

export const BottomNav = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const { type, staff } = useAuthStore()

  const hasPermission = (perm: 'reports' | 'clients' | 'settings') => {
    if (type === 'owner') return true
    if (!staff?.permissions) return false
    const perms = staff.permissions as any
    return perms[perm]
  }

  const navItems = [
    { icon: Home, label: t('dashboard.quick_actions'), path: '/dashboard', permission: true },
    { icon: Timer, label: t('dashboard.history'), path: '/sessions', permission: true },
    { icon: Users, label: t('dashboard.clients'), path: '/clients', permission: hasPermission('clients') },
    { icon: Settings, label: t('settings.title'), path: '/settings', permission: hasPermission('settings') },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[60px] bg-bg/95 backdrop-blur-xl border-t border-border z-[100] flex items-center justify-around px-2 pb-safe">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path
        const Icon = item.icon

        if (!item.permission) {
          return (
            <div key={item.path} className="flex flex-col items-center gap-1 opacity-20 grayscale">
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </div>
          )
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-colors relative ${
              isActive ? 'text-accent' : 'text-text3 hover:text-text2'
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
            {isActive && (
              <motion.div
                layoutId="nav-dot"
                className="absolute -bottom-1.5 w-1 h-1 bg-accent rounded-full"
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
