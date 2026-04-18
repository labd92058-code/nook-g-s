/**
 * BILLING ENGINE: dual billing mode implemented.
 * - 'time': total = timeCost only. Consumptions are informational.
 * - 'consumption': total = sum of extras. Time is NEVER included in the amount.
 *
 * CONFLICT RESOLVED: loadSession and loadProducts now run in parallel.
 * BILLING BUG FIXED: duration uses Math.floor (no float drift), amounts rounded to 2dp.
 */
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronLeft, MoreVertical, Clock, Gauge, AlertCircle,
  ShoppingBag, Plus, StopCircle, Edit2, Trash2, CheckCircle,
  Banknote, CreditCard, Wallet, Gift, Loader2, Phone, Timer
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../i18n'
import { useAudit } from '../hooks/useAudit'
import { Button } from '../components/ui/Button'
import { Session, Product } from '../types'
import { BottomSheet } from '../components/ui/BottomSheet'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { getSession, endSession, cancelSession, addExtrasToSession, removeExtraFromSession } from '../lib/services/sessions'
import { getActiveProducts } from '../lib/services/products'
import { format } from 'date-fns'

// ─── Billing helper ────────────────────────────────────────────────────────────
function computeElapsed(startedAt: string, endedAt?: string | null): number {
  const start = new Date(startedAt).getTime()
  const end = endedAt ? new Date(endedAt).getTime() : Date.now()
  return Math.max(0, end - start)
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Compute the time-based cost. Always non-negative, rounded to 2dp. */
function computeTimeCost(elapsedMs: number, ratePerHour: number): number {
  return Math.max(0, Math.round((elapsedMs / 3_600_000) * ratePerHour * 100) / 100)
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe, type } = useAuthStore()
  const addToast = useUIStore((state) => state.addToast)
  const { logAction } = useAudit()

  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [elapsed, setElapsed] = useState('')
  const [timeCost, setTimeCost] = useState(0)
  const [isLong, setIsLong] = useState(false)

  const [showExtras, setShowExtras] = useState(false)
  const [showEnd, setShowEnd] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({})
  const [itemToRemove, setItemToRemove] = useState<number | null>(null)
  const [isEnding, setIsEnding] = useState(false)

  // Load session and products in parallel
  useEffect(() => {
    const loadData = async () => {
      if (!id || !cafe) return
      const [sess, prods] = await Promise.all([
        getSession(id).catch(() => null),
        getActiveProducts(cafe.id).catch(() => []),
      ])

      if (!sess) {
        addToast("Session non trouvée", "error")
        navigate('/dashboard')
        return
      }
      setSession(sess)
      setProducts(prods)
      setIsLoading(false)
    }
    loadData()
  }, [id, cafe])

  // Live timer — only runs for active sessions
  useEffect(() => {
    if (!session) return
    const tick = () => {
      const elapsedMs = computeElapsed(session.started_at, session.ended_at)
      setElapsed(formatDuration(elapsedMs))
      setTimeCost(computeTimeCost(elapsedMs, session.rate_per_hour))
      setIsLong(elapsedMs / 3_600_000 >= (cafe?.long_session_alert_hours || 3))
    }
    tick()
    if (session.status !== 'active') return
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [session, cafe])

  const handleAddExtras = async () => {
    if (!session) return
    const toAdd = Object.entries(selectedExtras)
      .filter(([, qty]) => (qty as number) > 0)
      .map(([prodId, qty]) => {
        const p = products.find(p => p.id === prodId)!
        return { id: prodId, name: p.name, price: p.price, qty: qty as number }
      })
    if (!toAdd.length) return

    try {
      const updated = await addExtrasToSession(session, toAdd)
      await logAction('extras_added', {
        session_id: session.id,
        customer_name: session.customer_name,
        extras_added: toAdd.map(e => ({ name: e.name, qty: e.qty, price: e.price })),
      })
      setSession(updated)
      setShowExtras(false)
      setSelectedExtras({})
      addToast("Consommations ajoutées", "success")
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  const handleRemoveExtra = async (index: number) => {
    if (!session) return
    try {
      const updated = await removeExtraFromSession(session, index)
      setSession(updated)
      addToast("Article supprimé", "success")
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  const handleEndSession = async (method: string) => {
    if (!session) return
    setIsEnding(true)
    try {
      const elapsedMs = computeElapsed(session.started_at)
      // BILLING BUG FIXED: use Math.floor for duration — no floating point drift
      const durationMinutes = Math.floor(elapsedMs / 60_000)
      const finalTimeCost = computeTimeCost(elapsedMs, session.rate_per_hour)

      // HARD RULE: billing_mode determines what gets charged
      const totalAmount =
        session.billing_mode === 'consumption'
          ? Math.max(0, Math.round(session.extras_total * 100) / 100)  // time NEVER included
          : Math.max(0, Math.round((finalTimeCost + session.extras_total) * 100) / 100)

      await endSession({
        sessionId: session.id,
        durationMinutes,
        timeCost: finalTimeCost,
        totalAmount,
        paymentMethod: method,
      })

      await logAction('session_closed', {
        session_id: session.id,
        customer_name: session.customer_name,
        seat_number: session.seat_number,
        billing_mode: session.billing_mode,
        duration_minutes: durationMinutes,
        total_amount: totalAmount,
        payment_method: method,
      })

      addToast(`Session clôturée — ${totalAmount.toFixed(2)} DH`, "success")
      navigate('/dashboard')
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setIsEnding(false)
    }
  }

  const handleCancelSession = async () => {
    if (!session) return
    try {
      await cancelSession(session.id)
      await logAction('session_cancelled', {
        session_id: session.id,
        customer_name: session.customer_name,
      })
      addToast("Session annulée", "success")
      navigate('/dashboard')
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    )
  }

  // Compute what to show as the bill total based on billing mode
  const displayTotal =
    session.billing_mode === 'consumption'
      ? Math.max(0, Math.round(session.extras_total * 100) / 100)
      : Math.max(0, Math.round((timeCost + session.extras_total) * 100) / 100)

  const isConsumption = session.billing_mode === 'consumption'

  return (
    <div className="min-h-screen bg-bg pb-32">
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/90 backdrop-blur-xl border-b border-border z-[100] flex items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text3 hover:text-text">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold text-text">Place {session.seat_number}</h1>
          {/* Billing mode badge */}
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
            isConsumption
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : 'bg-accent-glow border-accent-border text-accent2'
          }`}>
            {isConsumption ? 'Conso.' : 'Temps'}
          </span>
        </div>
        <div className="relative">
          <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-2 -mr-2 text-text3 hover:text-text">
            <MoreVertical size={20} />
          </button>
          <AnimatePresence>
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-[110]" onClick={() => setShowMoreMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl overflow-hidden shadow-xl shadow-black/50 z-[120]"
                >
                  <div className="flex flex-col py-1">
                    {type === 'owner' && (
                      <button
                        onClick={() => { setShowMoreMenu(false); setShowCancel(true) }}
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-error hover:bg-error/10 transition-colors text-left"
                      >
                        <Trash2 size={16} />
                        Annuler la session
                      </button>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="pt-20 px-4 space-y-6">
        {/* Timer Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-3xl border border-accent/20 bg-linear-to-br from-accent/10 via-surface to-transparent flex flex-col items-center text-center relative overflow-hidden shadow-2xl shadow-accent/10"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-accent to-transparent opacity-50" />
          <div className="text-xs font-bold text-accent uppercase tracking-widest mb-1">{session.customer_name}</div>
          {session.customer_phone && (
            <div className="text-[11px] text-text3 font-medium mb-4 flex items-center justify-center gap-1.5">
              <Phone size={12} />{session.customer_phone}
            </div>
          )}
          <motion.div
            animate={session.status === 'active' ? { scale: [1, 1.02, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="text-6xl font-mono font-black text-text tracking-tighter mb-6 drop-shadow-glow"
          >
            {elapsed}
          </motion.div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2 text-text3 text-[10px] font-bold uppercase tracking-wider">
              <Clock size={12} className="text-accent" />
              {format(new Date(session.started_at), 'HH:mm')}
            </div>
            <div className="flex items-center gap-2 text-text3 text-[10px] font-bold uppercase tracking-wider">
              <Gauge size={12} className="text-accent2" />
              {session.rate_per_hour.toFixed(2)} DH/h
            </div>
          </div>
          {session.status === 'completed' && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-6 px-4 py-2 bg-success/10 border border-success/20 rounded-full flex items-center gap-2 text-success text-[10px] font-black uppercase tracking-widest">
              <CheckCircle size={12} /> Terminée
            </motion.div>
          )}
          {session.status === 'cancelled' && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-6 px-4 py-2 bg-error/10 border border-error/20 rounded-full flex items-center gap-2 text-error text-[10px] font-black uppercase tracking-widest">
              <AlertCircle size={12} /> Annulée
            </motion.div>
          )}
          {isLong && session.status === 'active' && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-6 px-4 py-2 bg-warning/10 border border-warning/20 rounded-full flex items-center gap-2 text-warning text-[10px] font-black uppercase tracking-widest">
              <AlertCircle size={12} /> Session longue
            </motion.div>
          )}
        </motion.div>

        {/* Bill Details */}
        <section className="space-y-3">
          <div className="px-1">
            <h3 className="text-[10px] font-bold text-text3 uppercase tracking-widest">Détails de la facture</h3>
          </div>

          {/* Time line — always shown, but greyed out in consumption mode */}
          <div className={`p-4 bg-surface border rounded-2xl flex items-center justify-between ${isConsumption ? 'border-border opacity-50' : 'border-border'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                <Clock size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-text">Temps de session</div>
                <div className="text-[10px] text-text3 font-medium">
                  {elapsed.split(':').slice(0, 2).join('h ')}min
                  {isConsumption && <span className="ml-2 text-[9px] text-text3 italic">(non facturé)</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-mono font-bold ${isConsumption ? 'text-text3 line-through' : 'text-accent2'}`}>
                {timeCost.toFixed(2)} DH
              </div>
            </div>
          </div>

          {/* Extras */}
          {(session.extras as any[]).length > 0 && (
            <div className="grid grid-cols-1 gap-3">
              {(session.extras as any[]).map((extra, i) => (
                <div key={i} className="p-4 bg-surface border border-border rounded-2xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-surface2 rounded-lg flex items-center justify-center text-text3">
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-text">{extra.name}</div>
                      <div className="text-[10px] text-text3 font-medium">{extra.qty} × {extra.price.toFixed(2)} DH</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-mono font-bold text-text">{(extra.price * extra.qty).toFixed(2)} DH</div>
                    {type === 'owner' && session.status === 'active' && (
                      <button onClick={() => setItemToRemove(i)} className="p-2 -mr-2 text-text3 hover:text-error transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          <div className="p-4 bg-surface border border-accent/20 rounded-2xl flex justify-between items-center shadow-lg shadow-accent/5">
            <div className="text-sm font-bold text-text">Total à payer</div>
            <div className="text-2xl font-mono font-extrabold text-accent2">{displayTotal.toFixed(2)} DH</div>
          </div>
        </section>

        {session.status === 'active' && (
          <button
            onClick={() => setShowExtras(true)}
            className="w-full py-5 bg-surface2 border border-dashed border-border rounded-2xl flex items-center justify-center gap-3 text-text3 hover:text-accent hover:border-accent hover:bg-accent/5 transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-bg flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
              <Plus size={18} />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest">{t('sessions.add_extra')}</span>
          </button>
        )}
      </main>

      {/* Bottom Action */}
      {session.status === 'active' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-bg via-bg to-transparent pt-12">
          <Button
            onClick={() => setShowEnd(true)}
            className="w-full h-14 text-lg bg-linear-to-br from-error to-[#dc2626] shadow-error/30"
          >
            <StopCircle size={20} />
            {t('sessions.end')}
          </Button>
        </div>
      )}

      {/* Extras Sheet */}
      <BottomSheet isOpen={showExtras} onClose={() => setShowExtras(false)} title="Consommations">
        <div className="space-y-6 pt-4">
          {['boisson', 'nourriture', 'autre'].map(cat => {
            const catProducts = products.filter(p => p.category === cat)
            if (catProducts.length === 0) return null
            return (
              <div key={cat} className="space-y-3">
                <h4 className="text-[10px] font-bold text-text3 uppercase tracking-widest">{cat}</h4>
                <div className="grid grid-cols-2 gap-3">
                  {catProducts.map(p => (
                    <div key={p.id} className={`p-3 rounded-xl border transition-all ${selectedExtras[p.id] ? 'bg-accent-glow border-accent' : 'bg-surface2 border-border'}`}>
                      <div className="text-sm font-bold text-text mb-1">{p.name}</div>
                      <div className="text-xs text-accent2 font-mono mb-3">{p.price.toFixed(2)} DH</div>
                      <div className="flex items-center justify-between">
                        <button onClick={() => setSelectedExtras(prev => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1) }))} className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text2 border border-border">-</button>
                        <span className="text-sm font-bold font-mono">{selectedExtras[p.id] || 0}</span>
                        <button onClick={() => setSelectedExtras(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))} className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text2 border border-border">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          <Button className="w-full h-14 mt-4" onClick={handleAddExtras} disabled={Object.values(selectedExtras).every(v => v === 0)}>
            Ajouter à la session
          </Button>
        </div>
      </BottomSheet>

      {/* End Session Sheet */}
      <BottomSheet isOpen={showEnd} onClose={() => setShowEnd(false)} title="Clôturer la session">
        <div className="space-y-8 pt-4">
          {/* Billing mode context */}
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${isConsumption ? 'bg-blue-500/5 border-blue-500/20' : 'bg-accent-glow border-accent-border'}`}>
            <Timer size={16} className={isConsumption ? 'text-blue-400' : 'text-accent'} />
            <div className="text-xs text-text2">
              <span className="font-bold">{isConsumption ? 'Mode consommation' : 'Mode temps'} · </span>
              {isConsumption ? 'Le temps ne sera pas facturé.' : 'Le temps est inclus dans la facture.'}
            </div>
          </div>

          <div className="bg-surface2 p-4 rounded-xl border border-border space-y-2">
            <div className="flex justify-between text-xs text-text3">
              <span>{session.customer_name} — Place {session.seat_number}</span>
              <span>{elapsed.split(':').slice(0, 2).join('h ')}min</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-bold text-text">Total à payer</span>
              <span className="text-2xl font-mono font-extrabold text-accent2">{displayTotal.toFixed(2)} DH</span>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-text3 uppercase tracking-widest">{t('sessions.payment_method')}</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'cash', icon: Banknote, label: t('sessions.cash') },
                { id: 'card', icon: CreditCard, label: t('sessions.card') },
                { id: 'account', icon: Wallet, label: t('sessions.account') },
                { id: 'free', icon: Gift, label: t('sessions.free') },
              ].map(method => (
                <button
                  key={method.id}
                  onClick={() => handleEndSession(method.id)}
                  disabled={isEnding}
                  className="h-20 flex flex-col items-center justify-center gap-2 bg-surface2 border border-border rounded-xl hover:border-accent transition-all active:scale-95 disabled:opacity-50"
                >
                  <method.icon size={20} className="text-text2" />
                  <span className="text-xs font-bold text-text">{method.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={itemToRemove !== null}
        onClose={() => setItemToRemove(null)}
        onConfirm={() => {
          if (itemToRemove !== null) handleRemoveExtra(itemToRemove)
          setItemToRemove(null)
        }}
        title="Supprimer l'article ?"
        message="Voulez-vous vraiment retirer cet article de la session ?"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={handleCancelSession}
        title="Annuler la session ?"
        message="Cette action est irréversible. La session sera marquée comme annulée."
        variant="danger"
      />
    </div>
  )
}
