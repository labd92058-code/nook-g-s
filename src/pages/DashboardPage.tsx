import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  PlusCircle, List, Users, BarChart2, Zap, Clock, 
  RefreshCw, Activity, CheckCircle, AlertTriangle, 
  Banknote, CreditCard, Gift, Wallet, ChevronRight, Loader2
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { BottomNav } from '../components/layout/BottomNav'
import { SessionCard } from '../components/sessions/SessionCard'
import { Button } from '../components/ui/Button'
import { useAuthStore } from '../stores/authStore'
import { useSessionStore } from '../stores/sessionStore'
import { useUIStore } from '../stores/uiStore'
import { useRealtime } from '../hooks/useRealtime'
import { useTranslation } from '../i18n'
import { getCompletedSessions } from '../lib/services/sessions'
import { Session } from '../types'
import { format } from 'date-fns'

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe, type, staff } = useAuthStore()
  const addToast = useUIStore((state) => state.addToast)
  const { activeSessions } = useSessionStore()
  const [lastSessions, setLastSessions] = useState<Session[]>([])
  const [todayStats, setTodayStats] = useState({ revenue: 0, total: 0, completed: 0 })
  const [isRefreshing, setIsRefreshing] = useState(false)

  useRealtime()

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadStats = useCallback(async () => {
    if (!cafe) return
    setIsRefreshing(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const sessions = await getCompletedSessions(cafe.id, today, 100)
      const revenue = sessions.reduce((acc, s) => acc + s.total_amount, 0)
      setTodayStats({
        revenue,
        total: sessions.length + activeSessions.length,
        completed: sessions.length,
      })
      setLastSessions(sessions.slice(0, 5))
    } catch {
      // Non-fatal — stats refresh is best-effort
    } finally {
      setIsRefreshing(false)
    }
  }, [cafe, activeSessions.length])

  useEffect(() => {
    loadStats()
  }, [cafe])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      loadStats()
    }, 800)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [activeSessions.length])

  const hasPermission = (perm: 'reports' | 'clients') => {
    if (type === 'owner') return true
    if (!staff?.permissions) return false
    const perms = staff.permissions as any
    return perms[perm]
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <TopBar />
      
      <main className="pt-20 px-4 space-y-8">
        {/* Long Session Global Alert */}
        {activeSessions.some(s => {
          const start = new Date(s.started_at).getTime()
          const now = new Date().getTime()
          const hours = (now - start) / 3600000
          return hours >= (cafe?.long_session_alert_hours || 3)
        }) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-error-dim border border-error/30 rounded-2xl flex items-center gap-4 text-error"
          >
            <div className="w-10 h-10 bg-error/10 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-widest">Attention</div>
              <div className="text-xs font-medium opacity-80">Certaines sessions dépassent la durée limite autorisée.</div>
            </div>
          </motion.div>
        )}

        {/* Revenue Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-6 rounded-2xl border border-accent-border bg-linear-to-br from-accent/10 to-accent/5 overflow-hidden"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-accent2 uppercase tracking-widest">
              {t('dashboard.revenue_today')}
            </span>
            <button 
              onClick={loadStats}
              className={`text-text3 hover:text-accent transition-all ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={14} />
            </button>
          </div>
          
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-4xl font-mono font-extrabold text-text">
              {todayStats.revenue.toFixed(2)}
            </span>
            <span className="text-xl font-mono font-bold text-text3">DH</span>
          </div>

          <div className="flex gap-2">
            <div className="bg-surface/50 border border-border px-3 py-1.5 rounded-full flex items-center gap-2">
              <Activity size={12} className="text-text3" />
              <span className="text-[11px] font-semibold">{todayStats.total} sessions</span>
            </div>
            <div className="bg-accent-glow border border-accent-border px-3 py-1.5 rounded-full flex items-center gap-2 text-accent2">
              <Zap size={12} />
              <span className="text-[11px] font-semibold">{activeSessions.length} actives</span>
            </div>
            <div className="bg-success-dim border border-success/20 px-3 py-1.5 rounded-full flex items-center gap-2 text-success">
              <CheckCircle size={12} />
              <span className="text-[11px] font-semibold">{todayStats.completed} clôturées</span>
            </div>
          </div>
        </motion.div>

        {/* Active Sessions */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-md font-bold text-text flex items-center gap-2">
              {t('dashboard.active_sessions')}
              <span className="px-2 py-0.5 bg-accent-glow text-accent2 rounded-full text-[10px]">{activeSessions.length}</span>
            </h2>
            {activeSessions.length > 0 && (
              <Link to="/sessions/new" className="text-xs font-semibold text-accent hover:underline">
                + {t('dashboard.start_session')}
              </Link>
            )}
          </div>

          {activeSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-surface/30 border border-dashed border-border rounded-2xl">
              <Clock size={40} className="text-text3 mb-4" />
              <p className="text-sm text-text2 font-medium">{t('dashboard.no_active_sessions')}</p>
              <Button 
                variant="ghost" 
                className="mt-4"
                onClick={() => navigate('/sessions/new')}
              >
                {t('dashboard.start_session')}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence mode="popLayout">
                {activeSessions.map((session) => (
                  <div key={session.id}>
                    <SessionCard 
                      session={session} 
                      onEnd={(s) => navigate(`/sessions/${s.id}`)} 
                    />
                  </div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Last Sessions */}
        {lastSessions.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-md font-bold text-text">{t('dashboard.last_sessions')}</h2>
            <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
              {lastSessions.map((session) => (
                <div key={session.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-[11px] font-mono text-text3">
                      {format(new Date(session.ended_at!), 'HH:mm')}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-text">
                        Place {session.seat_number} — {session.customer_name}
                      </div>
                      <div className="text-[10px] text-text3">
                        {session.duration_minutes} min
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-text">
                      {session.total_amount.toFixed(2)} DH
                    </div>
                    <div className="flex justify-end mt-0.5 text-text3">
                      {session.payment_method === 'cash' && <Banknote size={12} />}
                      {session.payment_method === 'card' && <CreditCard size={12} />}
                      {session.payment_method === 'account' && <Wallet size={12} />}
                      {session.payment_method === 'free' && <Gift size={12} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
