import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X, User, Phone, Armchair, Clock, Zap, Sliders, Play, Loader2, MessageSquare, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useSessionStore } from '../stores/sessionStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../i18n'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Session } from '../types'
import { format } from 'date-fns'

export default function NewSessionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe, staff, type } = useAuthStore()
  const { activeSessions } = useSessionStore()
  const addToast = useUIStore((state) => state.addToast)

  const [isLoading, setIsLoading] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [rateType, setRateType] = useState<'standard' | 'premium' | 'custom'>('standard')
  const [customRate, setCustomRate] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [recentCustomers, setRecentCustomers] = useState<string[]>([])

  useEffect(() => {
    const loadRecent = async () => {
      if (!cafe) return
      const { data } = await supabase
        .from('sessions')
        .select('customer_name')
        .eq('cafe_id', cafe.id)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (data) {
        const unique = Array.from(new Set(data.map(s => s.customer_name))).slice(0, 6)
        setRecentCustomers(unique)
      }
    }
    loadRecent()
  }, [cafe])

  const handleStartSession = async () => {
    if (!cafe || !customerName || !selectedSeat) return
    
    // Check if seat is already occupied
    if (activeSessions.some(s => s.seat_number === selectedSeat)) {
      addToast("Cette place est déjà occupée", "error")
      return
    }

    setIsLoading(true)
    try {
      const rate = rateType === 'standard' ? cafe.default_rate : 
                   rateType === 'premium' ? cafe.premium_rate : 
                   customRate

      const { error } = await supabase
        .from('sessions' as any)
        .insert({
          cafe_id: cafe.id,
          staff_id: type === 'staff' ? staff?.id : null,
          customer_name: customerName,
          customer_phone: customerPhone || null,
          seat_number: selectedSeat,
          rate_per_hour: rate,
          status: 'active',
          notes: notes || null,
          extras: []
        })
      
      if (error) throw error

      addToast(`Session démarrée — Place ${selectedSeat}`, "success")
      navigate('/dashboard')
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const occupiedSeats = activeSessions.map(s => s.seat_number)

  return (
    <div className="min-h-screen bg-bg pb-32">
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/90 backdrop-blur-xl border-b border-border z-[100] flex items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text3 hover:text-text">
          <X size={20} />
        </button>
        <h1 className="text-sm font-bold text-text">{t('sessions.new')}</h1>
        <div className="w-8" />
      </header>

      <main className="pt-20 px-4 space-y-8">
        {/* Client Section */}
        <section className="space-y-4">
          <label className="text-[10px] font-bold text-text3 uppercase tracking-widest">{t('sessions.client')}</label>
          <div className="space-y-3">
            <Input
              placeholder="Nom du client"
              icon={<User size={18} />}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-14 text-lg"
              autoFocus
              rightElement={
                customerName && (
                  <button onClick={() => setCustomerName('')} className="text-text3">
                    <X size={16} />
                  </button>
                )
              }
            />
            
            {recentCustomers.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {recentCustomers.map(name => (
                  <button
                    key={name}
                    onClick={() => setCustomerName(name)}
                    className="flex-shrink-0 px-3 py-1.5 bg-surface2 border border-border rounded-lg text-xs font-medium text-text2 hover:text-text hover:border-text3 transition-all active:scale-95"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            <Input
              type="tel"
              placeholder="Téléphone (optionnel)"
              icon={<Phone size={18} />}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
        </section>

        {/* Seat Grid */}
        <section className="space-y-4">
          <label className="text-[10px] font-bold text-text3 uppercase tracking-widest">Sélectionner une place</label>
          <div className="grid grid-cols-5 gap-2.5">
            {Array.from({ length: cafe?.total_seats || 20 }).map((_, i) => {
              const seatNum = i + 1
              const isOccupied = occupiedSeats.includes(seatNum)
              const isSelected = selectedSeat === seatNum
              
              return (
                <motion.button
                  key={seatNum}
                  whileTap={!isOccupied ? { scale: 0.92 } : {}}
                  onClick={() => !isOccupied && setSelectedSeat(seatNum)}
                  className={`h-14 flex flex-col items-center justify-center rounded-xl border transition-all relative ${
                    isOccupied 
                      ? 'bg-error/5 border-error/20 text-error/40 cursor-not-allowed' 
                      : isSelected
                        ? 'bg-accent-glow border-accent text-accent2 shadow-[0_0_12px_rgba(249,115,22,0.2)] scale-105 z-10'
                        : 'bg-surface border-border text-text2 hover:border-text3'
                  }`}
                >
                  <span className="text-lg font-mono font-bold">{seatNum}</span>
                  {isOccupied && (
                    <span className="text-[8px] font-bold uppercase absolute bottom-1">Occ.</span>
                  )}
                </motion.button>
              )
            })}
          </div>
        </section>

        {/* Rate Section */}
        <section className="space-y-4">
          <label className="text-[10px] font-bold text-text3 uppercase tracking-widest">{t('sessions.rate')}</label>
          <div className="space-y-2">
            <button
              onClick={() => setRateType('standard')}
              className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                rateType === 'standard' ? 'bg-accent-glow border-accent' : 'bg-surface border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock size={18} className={rateType === 'standard' ? 'text-accent' : 'text-text3'} />
                <div className="text-left">
                  <div className="text-sm font-bold text-text">Standard</div>
                  <div className="text-xs text-text2">{cafe?.default_rate.toFixed(2)} DH / heure</div>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                rateType === 'standard' ? 'bg-accent border-accent' : 'border-border'
              }`}>
                {rateType === 'standard' && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </button>

            <button
              onClick={() => setRateType('premium')}
              className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                rateType === 'premium' ? 'bg-accent-glow border-accent' : 'bg-surface border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <Zap size={18} className={rateType === 'premium' ? 'text-accent' : 'text-text3'} />
                <div className="text-left">
                  <div className="text-sm font-bold text-text">Premium</div>
                  <div className="text-xs text-text2">{cafe?.premium_rate.toFixed(2)} DH / heure</div>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                rateType === 'premium' ? 'bg-accent border-accent' : 'border-border'
              }`}>
                {rateType === 'premium' && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </button>

            <div className={`rounded-xl border transition-all overflow-hidden ${
              rateType === 'custom' ? 'bg-accent-glow border-accent' : 'bg-surface border-border'
            }`}>
              <button
                onClick={() => setRateType('custom')}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Sliders size={18} className={rateType === 'custom' ? 'text-accent' : 'text-text3'} />
                  <div className="text-sm font-bold text-text">Personnalisé</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  rateType === 'custom' ? 'bg-accent border-accent' : 'border-border'
                }`}>
                  {rateType === 'custom' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
              <AnimatePresence>
                {rateType === 'custom' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4"
                  >
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="Tarif horaire en DH"
                      value={customRate || ''}
                      onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                      rightElement={<span className="text-xs font-bold text-text3">DH/h</span>}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Notes Section */}
        <section className="space-y-2">
          <button 
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-2 text-text3 hover:text-text2 transition-colors"
          >
            <MessageSquare size={16} />
            <span className="text-xs font-medium">Ajouter une note</span>
            <ChevronDown size={14} className={`transition-transform ${showNotes ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <textarea
                  className="input h-24 py-3 resize-none"
                  placeholder="Note interne..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-bg via-bg to-transparent pt-12 z-50">
        <AnimatePresence>
          {customerName && selectedSeat && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="mb-4 p-4 bg-surface2 border border-accent-border rounded-xl flex items-center justify-between"
            >
              <div>
                <div className="text-[10px] text-text3 font-bold uppercase tracking-widest mb-1">Aperçu</div>
                <div className="text-sm font-bold text-text">
                  {customerName} — Place {selectedSeat}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-accent2">
                  {rateType === 'standard' ? cafe?.default_rate : rateType === 'premium' ? cafe?.premium_rate : customRate} DH/h
                </div>
                <div className="text-[10px] text-text3">Début: {format(new Date(), 'HH:mm')}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={handleStartSession}
          className="w-full h-14 text-lg"
          disabled={!customerName || !selectedSeat}
          isLoading={isLoading}
        >
          <Play size={20} className="fill-current" />
          {t('sessions.start')}
        </Button>
      </div>
    </div>
  )
}
