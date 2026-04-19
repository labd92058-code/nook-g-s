import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Armchair, StopCircle, Zap, AlertCircle, Clock as ClockIcon } from 'lucide-react'
import { Session } from '../../types'
import { useTranslation } from '../../i18n'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { useAuthStore } from '../../stores/authStore'

interface SessionCardProps {
  session: Session
  onEnd: (session: Session) => void
}

export const SessionCard = ({ session, onEnd }: SessionCardProps) => {
  const { t } = useTranslation()
  const { cafe } = useAuthStore()
  const [elapsed, setElapsed] = useState('')
  const [amount, setAmount] = useState(0)
  const [isLong, setIsLong] = useState(false)

  useEffect(() => {
    const update = () => {
      const start = new Date(session.started_at).getTime()
      const now = new Date().getTime()
      const diffMs = now - start
      
      const hours = Math.floor(diffMs / 3600000)
      const minutes = Math.floor((diffMs % 3600000) / 60000)
      const seconds = Math.floor((diffMs % 60000) / 1000)
      
      setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      
      // BILLING BUG FIXED: amount displayed depends on billing mode
      // time mode: time cost only (extras are informational)
      // consumption mode: extras total only (time is never billed)
      const durationHours = diffMs / 3600000
      if (session.billing_mode === 'consumption') {
        setAmount(session.extras_total)
      } else {
        setAmount(durationHours * session.rate_per_hour)
      }
      
      // Check for long session based on cafe settings
      const alertHours = cafe?.long_session_alert_hours || 3
      if (hours >= alertHours) setIsLong(true)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [session])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`card relative overflow-hidden transition-all duration-500 ${
        isLong ? 'border-error/50 bg-error/5 shadow-lg shadow-error/10' : ''
      }`}
    >
      {isLong && (
        <>
          <div className="absolute top-0 left-0 right-0 h-1 bg-error animate-pulse" />
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-error/10 rounded-full blur-2xl animate-pulse" />
        </>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-accent-glow border border-accent-border px-2 py-0.5 rounded-full flex items-center gap-1.5 text-accent2">
            <Armchair size={12} />
            <span className="text-[11px] font-bold">Place {session.seat_number}</span>
          </div>
          <span className="text-sm font-semibold text-text">{session.customer_name}</span>
        </div>
        <div className="bg-surface2 px-2 py-0.5 rounded-full text-[10px] text-text3 font-medium">
          {session.rate_per_hour.toFixed(2)} DH/h
        </div>
      </div>

      {isLong && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-1.5 text-error text-[10px] font-black uppercase tracking-widest mb-3"
        >
          <AlertCircle size={12} className="animate-bounce" />
          Alerte: Session trop longue
        </motion.div>
      )}

      <div className="mt-4 flex items-center justify-between bg-surface2/50 border border-border/50 rounded-xl p-3">
        <div className="flex gap-4">
          <div>
            <div className="text-[9px] text-text3 font-bold uppercase tracking-widest mb-1">{t('sessions.duration')}</div>
            <div className="text-[17px] font-mono font-bold text-text leading-none tracking-tight">{elapsed}</div>
          </div>
          <div className="w-px bg-border/50" />
          <div>
            <div className="text-[9px] text-text3 font-bold uppercase tracking-widest mb-1">{t('sessions.amount')}</div>
            <div className="text-[17px] font-mono font-bold text-accent2 leading-none tracking-tight">{amount.toFixed(2)} DH</div>
          </div>
        </div>

        <button
          onClick={() => onEnd(session)}
          className="flex items-center justify-center w-11 h-11 shrink-0 bg-gradient-to-br from-error/10 to-error/5 border border-error/20 text-error rounded-xl transition-all hover:bg-error/20 active:scale-90 shadow-sm shadow-error/5"
          title={t('sessions.end')}
          aria-label={t('sessions.end')}
        >
          <StopCircle size={20} className="fill-error/20" />
        </button>
      </div>
    </motion.div>
  )
}
