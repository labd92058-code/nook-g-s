import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X, User, Phone, Armchair, Clock, Zap, Sliders, Play, Loader2, MessageSquare, ChevronDown, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useSessionStore } from '../stores/sessionStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../i18n'
import { useAudit } from '../hooks/useAudit'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Session } from '../types'
import { format } from 'date-fns'

export default function NewSessionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { clientName?: string, clientPhone?: string, clientId?: string } | null

  const { cafe, staff, type } = useAuthStore()
  const { activeSessions } = useSessionStore()
  const addToast = useUIStore((state) => state.addToast)
  const { logAction } = useAudit()

  const [isLoading, setIsLoading] = useState(false)
  const [customerName, setCustomerName] = useState(state?.clientName || '')
  const [customerPhone, setCustomerPhone] = useState(state?.clientPhone || '')
  const [clientId, setClientId] = useState(state?.clientId || null)
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [rateType, setRateType] = useState<'standard' | 'premium' | 'custom'>('standard')
  const [customRate, setCustomRate] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [saveAsClient, setSaveAsClient] = useState(false)
  const [recentCustomers, setRecentCustomers] = useState<string[]>([])

  useEffect(() => {
    const loadRecent = async () => {
      if (!cafe) return
      const { data } = await supabase
        .from('sessions')
        .select('customer_name')
        .eq('cafe_id', cafe.id)
        .order('started_at', { ascending: false })
        .limit(50)
      
      if (data) {
        const seen = new Set<string>()
        const unique: string[] = []
        for (const s of data) {
          if (!seen.has(s.customer_name) && unique.length < 6) {
            seen.add(s.customer_name)
            unique.push(s.customer_name)
          }
        }
        setRecentCustomers(unique)
      }
    }
    loadRecent()
  }, [cafe])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 10) val = val.slice(0, 10)
    
    const parts = []
    for (let i = 0; i < val.length; i += 2) {
      parts.push(val.slice(i, i + 2))
    }
    setCustomerPhone(parts.join(' '))
  }

  const handleStartSession = async () => {
    if (!cafe || !customerName || !selectedSeat) return
    
    // Check if seat is already occupied
    if (activeSessions.some(s => s.seat_number === selectedSeat)) {
      addToast("Cette place est déjà occupée", "error")
      return
    }

    setIsLoading(true)
    try {
      let finalClientId = clientId;

      if (saveAsClient && !clientId) {
        const { data: clientData, error: clientError } = await supabase
          .from('client_accounts')
          .insert({
            cafe_id: cafe.id,
            name: customerName,
            phone: customerPhone || null,
            balance: 0,
            total_visits: 0,
            total_spent: 0
          })
          .select()
          .single()
        
        if (clientError) throw clientError;
        if (clientData) {
          finalClientId = clientData.id;
          await logAction('client_created', {
              client_id: finalClientId,
              name: customerName
          })
        }
      }

      const rate = rateType === 'standard' ? cafe.default_rate : 
                   rateType === 'premium' ? cafe.premium_rate : 
                   customRate

      const { error } = await supabase
        .from('sessions' as any)
        .insert({
          cafe_id: cafe.id,
          staff_id: type === 'staff' ? staff?.id : null,
          client_account_id: finalClientId,
          customer_name: customerName,
          customer_phone: customerPhone || null,
          seat_number: selectedSeat,
          rate_per_hour: rate,
          status: 'active',
          notes: notes || null,
          extras: []
        })
      
      if (error) throw error

      await logAction('session_started', {
        customer_name: customerName,
        seat_number: selectedSeat,
        rate_per_hour: rate
      })

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

            <div className="flex flex-col gap-3">
              <Input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="06 00 00 00 00"
                icon={<Phone size={18} />}
                value={customerPhone}
                onChange={handlePhoneChange}
                className="h-14 text-[19px] tracking-widest font-mono font-bold"
                rightElement={
                  customerPhone && (
                    <button onClick={() => setCustomerPhone('')} className="text-text3 p-1">
                      <X size={16} />
                    </button>
                  )
                }
              />
              
              {!clientId && customerName && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <button
                      onClick={() => setSaveAsClient(!saveAsClient)}
                      className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all active:scale-[0.98] ${
                        saveAsClient 
                          ? 'bg-accent-glow border-accent' 
                          : 'bg-surface border-border hover:border-text3'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${saveAsClient ? 'bg-accent text-white' : 'bg-surface2 text-text3'}`}>
                          <UserPlus size={18} />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-text">
                            Nouveau compte client
                          </div>
                          <div className={`text-[11px] mt-0.5 ${saveAsClient ? 'text-accent2' : 'text-text3'}`}>
                            Enregistrer pour de futures visites
                          </div>
                        </div>
                      </div>
                      <div className={`w-11 h-6 rounded-full relative transition-colors ${saveAsClient ? 'bg-accent' : 'bg-border'}`}>
                        <motion.div 
                          animate={{ x: saveAsClient ? 22 : 2 }}
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                      </div>
                    </button>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
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
