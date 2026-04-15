import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  ChevronLeft, MoreVertical, Clock, Gauge, AlertCircle, 
  ShoppingBag, Plus, StopCircle, Edit2, Trash2, CheckCircle,
  Banknote, CreditCard, Wallet, Gift, Loader2
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../i18n'
import { useAudit } from '../hooks/useAudit'
import { Button } from '../components/ui/Button'
import { Session, Product } from '../types'
import { BottomSheet } from '../components/ui/BottomSheet'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { format } from 'date-fns'

export default function SessionDetailPage() {
  const { id } = useParams()
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
  
  const [products, setProducts] = useState<Product[]>([])
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({})
  const [itemToRemove, setItemToRemove] = useState<number | null>(null)

  useEffect(() => {
    const loadSession = async () => {
      if (!id) return
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error || !data) {
        addToast("Session non trouvée", "error")
        navigate('/dashboard')
        return
      }
      setSession(data)
      setIsLoading(false)
    }

    const loadProducts = async () => {
      if (!cafe) return
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('cafe_id', cafe.id)
        .eq('active', true)
        .order('sort_order')
      if (data) setProducts(data)
    }

    loadSession()
    loadProducts()
  }, [id, cafe])

  useEffect(() => {
    if (!session) return
    const update = () => {
      const start = new Date(session.started_at).getTime()
      const now = new Date().getTime()
      const diffMs = now - start
      
      const hours = Math.floor(diffMs / 3600000)
      const minutes = Math.floor((diffMs % 3600000) / 60000)
      const seconds = Math.floor((diffMs % 60000) / 1000)
      
      setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      
      const durationHours = diffMs / 3600000
      setTimeCost(durationHours * session.rate_per_hour)
      if (hours >= 3) setIsLong(true)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [session])

  const handleAddExtras = async () => {
    if (!session) return
    const newExtras = [...(session.extras as any[])]
    let newExtrasTotal = session.extras_total

    Object.entries(selectedExtras).forEach(([prodId, qty]: [string, any]) => {
      if (qty <= 0) return
      const product = products.find(p => p.id === prodId)
      if (product) {
        newExtras.push({ id: prodId, name: product.name, price: product.price, qty })
        newExtrasTotal += product.price * qty
      }
    })

    try {
      const { data, error } = await supabase
        .from('sessions' as any)
        .update({ extras: newExtras, extras_total: newExtrasTotal })
        .eq('id', session.id)
        .select()
        .single()
      
      if (error) throw error
      
      await logAction('extras_added', {
        session_id: session.id,
        customer_name: session.customer_name,
        seat_number: session.seat_number,
        extras_added: Object.entries(selectedExtras).filter(([_, q]: [string, any]) => q > 0).map(([id, q]: [string, any]) => {
          const p = products.find(p => p.id === id)
          return { name: p?.name, qty: q, price: p?.price }
        })
      })

      setSession(data)
      setShowExtras(false)
      setSelectedExtras({})
      addToast("Consommations ajoutées", "success")
    } catch (error: any) {
      addToast(error.message, 'error')
    }
  }

  const handleRemoveExtra = async (index: number) => {
    if (!session) return
    const newExtras = [...(session.extras as any[])]
    const removed = newExtras.splice(index, 1)[0]
    const newExtrasTotal = session.extras_total - (removed.price * removed.qty)

    try {
      const { data, error } = await supabase
        .from('sessions' as any)
        .update({ extras: newExtras, extras_total: newExtrasTotal })
        .eq('id', session.id)
        .select()
        .single()
      
      if (error) throw error
      setSession(data)
      addToast("Article supprimé", "success")
    } catch (error: any) {
      addToast(error.message, 'error')
    }
  }

  const handleEndSession = async (method: string) => {
    if (!session) return
    setIsLoading(true)
    try {
      const start = new Date(session.started_at).getTime()
      const end = new Date().getTime()
      const durationMinutes = Math.floor((end - start) / 60000)
      const finalTimeCost = (durationMinutes / 60) * session.rate_per_hour
      const totalAmount = finalTimeCost + session.extras_total

      const { error } = await supabase
        .from('sessions' as any)
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          duration_minutes: durationMinutes,
          time_cost: finalTimeCost,
          total_amount: totalAmount,
          payment_method: method
        })
        .eq('id', session.id)
      
      if (error) throw error

      await logAction('session_closed', {
        session_id: session.id,
        customer_name: session.customer_name,
        seat_number: session.seat_number,
        duration_minutes: durationMinutes,
        total_amount: totalAmount,
        payment_method: method
      })

      addToast(`Session clôturée — ${totalAmount.toFixed(2)} DH`, "success")
      navigate('/dashboard')
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    )
  }

  const totalAmount = timeCost + session.extras_total

  return (
    <div className="min-h-screen bg-bg pb-32">
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/90 backdrop-blur-xl border-b border-border z-[100] flex items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text3 hover:text-text">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-sm font-bold text-text">Place {session.seat_number}</h1>
        <button className="p-2 -mr-2 text-text3 hover:text-text">
          <MoreVertical size={20} />
        </button>
      </header>

      <main className="pt-20 px-4 space-y-6">
        {/* Timer Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-3xl border border-accent/20 bg-linear-to-br from-accent/10 via-surface to-transparent flex flex-col items-center text-center relative overflow-hidden shadow-2xl shadow-accent/10"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-accent to-transparent opacity-50" />
          
          <div className="text-xs font-bold text-accent uppercase tracking-widest mb-2">{session.customer_name}</div>
          <motion.div 
            animate={{ scale: [1, 1.02, 1] }}
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

          {isLong && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mt-6 px-4 py-2 bg-warning/10 border border-warning/20 rounded-full flex items-center gap-2 text-warning text-[10px] font-black uppercase tracking-widest"
            >
              <AlertCircle size={12} />
              Session longue
            </motion.div>
          )}
        </motion.div>

        {/* Bill Details */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-bold text-text3 uppercase tracking-widest">Détails de la facture</h3>
          </div>

          {/* Time Card */}
          <div className="p-4 bg-surface border border-border rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                <Clock size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-text">Temps de session</div>
                <div className="text-[10px] text-text3 font-medium">
                  {elapsed.split(':').slice(0, 2).join('h ')}min
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono font-bold text-accent2">
                {timeCost.toFixed(2)} DH
              </div>
            </div>
          </div>

          {/* Extras Cards */}
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
                      <div className="text-[10px] text-text3 font-medium">
                        {extra.qty} × {extra.price.toFixed(2)} DH
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-text">
                        {(extra.price * extra.qty).toFixed(2)} DH
                      </div>
                    </div>
                    {type === 'owner' && (
                      <button 
                        onClick={() => setItemToRemove(i)}
                        className="p-2 -mr-2 text-text3 hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total Summary */}
          <div className="p-4 bg-surface border border-accent/20 rounded-2xl flex justify-between items-center shadow-lg shadow-accent/5">
            <div className="text-sm font-bold text-text">Total à payer</div>
            <div className="text-2xl font-mono font-extrabold text-accent2">{totalAmount.toFixed(2)} DH</div>
          </div>
        </section>

        <button
          onClick={() => setShowExtras(true)}
          className="w-full py-5 bg-surface2 border border-dashed border-border rounded-2xl flex items-center justify-center gap-3 text-text3 hover:text-accent hover:border-accent hover:bg-accent/5 transition-all group"
        >
          <div className="w-8 h-8 rounded-full bg-bg flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
            <Plus size={18} />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest">{t('sessions.add_extra')}</span>
        </button>
      </main>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-bg via-bg to-transparent pt-12">
        <Button
          onClick={() => setShowEnd(true)}
          className="w-full h-14 text-lg bg-linear-to-br from-error to-[#dc2626] shadow-error/30"
        >
          <StopCircle size={20} />
          {t('sessions.end')}
        </Button>
      </div>

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
                    <div 
                      key={p.id} 
                      className={`p-3 rounded-xl border transition-all ${
                        selectedExtras[p.id] ? 'bg-accent-glow border-accent' : 'bg-surface2 border-border'
                      }`}
                    >
                      <div className="text-sm font-bold text-text mb-1">{p.name}</div>
                      <div className="text-xs text-accent2 font-mono mb-3">{p.price.toFixed(2)} DH</div>
                      <div className="flex items-center justify-between">
                        <button 
                          onClick={() => setSelectedExtras(prev => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1) }))}
                          className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text2 border border-border"
                        >
                          -
                        </button>
                        <span className="text-sm font-bold font-mono">{selectedExtras[p.id] || 0}</span>
                        <button 
                          onClick={() => setSelectedExtras(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }))}
                          className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text2 border border-border"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          <Button 
            className="w-full h-14 mt-4" 
            onClick={handleAddExtras}
            disabled={Object.values(selectedExtras).every(v => v === 0)}
          >
            Ajouter à la session
          </Button>
        </div>
      </BottomSheet>

      {/* End Session Sheet */}
      <BottomSheet isOpen={showEnd} onClose={() => setShowEnd(false)} title="Clôturer la session">
        <div className="space-y-8 pt-4">
          <div className="bg-surface2 p-4 rounded-xl border border-border space-y-2">
            <div className="flex justify-between text-xs text-text3">
              <span>{session.customer_name} — Place {session.seat_number}</span>
              <span>{elapsed.split(':').slice(0, 2).join('h ')}min</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-bold text-text">Total à payer</span>
              <span className="text-2xl font-mono font-extrabold text-accent2">{totalAmount.toFixed(2)} DH</span>
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
                  className="h-20 flex flex-col items-center justify-center gap-2 bg-surface2 border border-border rounded-xl hover:border-accent transition-all active:scale-95"
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
    </div>
  )
}
