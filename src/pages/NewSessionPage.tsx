/**
 * CONFLICT RESOLVED: billing mode is now selected at session-open time
 * and stored in the session record. Cannot be changed mid-session.
 */
import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X, User, Phone, Armchair, Clock, Zap, Sliders, Play, Loader2, MessageSquare, ChevronDown, UserPlus } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useSessionStore } from '../stores/sessionStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../i18n'
import { useAudit } from '../hooks/useAudit'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { BillingModeSelector } from '../components/sessions/BillingModeSelector'
import { BillingMode } from '../types'
import { startSession } from '../lib/services/sessions'
import { createClient } from '../lib/services/clients'
import { format } from 'date-fns'

export default function NewSessionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { clientName?: string; clientPhone?: string; clientId?: string } | null

  const { cafe, staff, type } = useAuthStore()
  const { activeSessions } = useSessionStore()
  const addToast = useUIStore((state) => state.addToast)
  const { logAction } = useAudit()

  const [isLoading, setIsLoading] = useState(false)
  const [customerName, setCustomerName] = useState(state?.clientName || '')
  const [customerPhone, setCustomerPhone] = useState(state?.clientPhone || '')
  const [clientId, setClientId] = useState<string | null>(state?.clientId || null)
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [rateType, setRateType] = useState<'standard' | 'premium' | 'custom'>('standard')
  const [customRate, setCustomRate] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [saveAsClient, setSaveAsClient] = useState(false)
  const [billingMode, setBillingMode] = useState<BillingMode>('time')
  const [step, setStep] = useState<'details' | 'billing'>(
    state?.clientName ? 'billing' : 'details'
  )

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 10) val = val.slice(0, 10)
    const parts: string[] = []
    for (let i = 0; i < val.length; i += 2) parts.push(val.slice(i, i + 2))
    setCustomerPhone(parts.join(' '))
  }

  const handleStartSession = async () => {
    if (!cafe || !customerName || !selectedSeat) return

    if (activeSessions.some(s => s.seat_number === selectedSeat)) {
      addToast("Cette place est déjà occupée", "error")
      return
    }

    setIsLoading(true)
    try {
      let finalClientId = clientId

      if (saveAsClient && !clientId) {
        const newClient = await createClient({
          cafeId: cafe.id,
          name: customerName,
          phone: customerPhone || null,
        })
        finalClientId = newClient.id
        await logAction('client_created', { client_id: finalClientId, name: customerName })
      }

      const rate =
        rateType === 'standard' ? cafe.default_rate
        : rateType === 'premium' ? cafe.premium_rate
        : customRate

      await startSession({
        cafeId: cafe.id,
        staffId: type === 'staff' ? (staff?.id ?? null) : null,
        clientAccountId: finalClientId,
        customerName,
        customerPhone: customerPhone || null,
        seatNumber: selectedSeat,
        ratePerHour: rate,
        billingMode,
        notes: notes || null,
      })

      await logAction('session_started', {
        customer_name: customerName,
        seat_number: selectedSeat,
        rate_per_hour: rate,
        billing_mode: billingMode,
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
  const canProceed = !!customerName && !!selectedSeat

  return (
    <div className="min-h-screen bg-bg pb-32">
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/90 backdrop-blur-xl border-b border-border z-[100] flex items-center justify-between px-4">
        <button onClick={() => (step === 'billing' ? setStep('details') : navigate(-1))} className="p-2 -ml-2 text-text3 hover:text-text">
          <X size={20} />
        </button>
        <h1 className="text-sm font-bold text-text">{t('sessions.new')}</h1>
        <div className="w-8" />
      </header>

      <main className="pt-20 px-4 space-y-8">
        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {(['details', 'billing'] as const).map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${step === s ? 'text-accent' : 'text-text3'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${step === s ? 'bg-accent border-accent text-white' : 'border-text3'}`}>
                  {i + 1}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest">
                  {s === 'details' ? 'Infos' : 'Facturation'}
                </span>
              </div>
              {i === 0 && <div className="flex-1 h-px bg-border" />}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 'details' ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
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
                        <button onClick={() => setCustomerName('')} className="text-text3"><X size={16} /></button>
                      )
                    }
                  />
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
                        <button onClick={() => setCustomerPhone('')} className="text-text3 p-1"><X size={16} /></button>
                      )
                    }
                  />
                  {!clientId && customerName && (
                    <AnimatePresence>
                      <motion.button
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onClick={() => setSaveAsClient(!saveAsClient)}
                        className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all active:scale-[0.98] ${saveAsClient ? 'bg-accent-glow border-accent' : 'bg-surface border-border hover:border-text3'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${saveAsClient ? 'bg-accent text-white' : 'bg-surface2 text-text3'}`}>
                            <UserPlus size={18} />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-bold text-text">Nouveau compte client</div>
                            <div className={`text-[11px] mt-0.5 ${saveAsClient ? 'text-accent2' : 'text-text3'}`}>Enregistrer pour de futures visites</div>
                          </div>
                        </div>
                        <div className={`w-11 h-6 rounded-full relative transition-colors ${saveAsClient ? 'bg-accent' : 'bg-border'}`}>
                          <motion.div animate={{ x: saveAsClient ? 22 : 2 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                        </div>
                      </motion.button>
                    </AnimatePresence>
                  )}
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
                        {isOccupied && <span className="text-[8px] font-bold uppercase absolute bottom-1">Occ.</span>}
                      </motion.button>
                    )
                  })}
                </div>
              </section>

              {/* Rate Section */}
              <section className="space-y-4">
                <label className="text-[10px] font-bold text-text3 uppercase tracking-widest">{t('sessions.rate')}</label>
                <div className="space-y-2">
                  {[
                    { id: 'standard', icon: Clock, label: 'Standard', rate: cafe?.default_rate },
                    { id: 'premium', icon: Zap, label: 'Premium', rate: cafe?.premium_rate },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setRateType(opt.id as any)}
                      className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${rateType === opt.id ? 'bg-accent-glow border-accent' : 'bg-surface border-border'}`}
                    >
                      <div className="flex items-center gap-3">
                        <opt.icon size={18} className={rateType === opt.id ? 'text-accent' : 'text-text3'} />
                        <div className="text-left">
                          <div className="text-sm font-bold text-text">{opt.label}</div>
                          <div className="text-xs text-text2">{opt.rate?.toFixed(2)} DH / heure</div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${rateType === opt.id ? 'bg-accent border-accent' : 'border-border'}`}>
                        {rateType === opt.id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </button>
                  ))}

                  <div className={`rounded-xl border transition-all overflow-hidden ${rateType === 'custom' ? 'bg-accent-glow border-accent' : 'bg-surface border-border'}`}>
                    <button onClick={() => setRateType('custom')} className="w-full p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sliders size={18} className={rateType === 'custom' ? 'text-accent' : 'text-text3'} />
                        <div className="text-sm font-bold text-text">Personnalisé</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${rateType === 'custom' ? 'bg-accent border-accent' : 'border-border'}`}>
                        {rateType === 'custom' && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </button>
                    <AnimatePresence>
                      {rateType === 'custom' && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-4">
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

              {/* Notes */}
              <section className="space-y-2">
                <button onClick={() => setShowNotes(!showNotes)} className="flex items-center gap-2 text-text3 hover:text-text2 transition-colors">
                  <MessageSquare size={16} />
                  <span className="text-xs font-medium">Ajouter une note</span>
                  <ChevronDown size={14} className={`transition-transform ${showNotes ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showNotes && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <textarea className="input h-24 py-3 resize-none" placeholder="Note interne..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="billing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-[10px] font-bold text-text3 uppercase tracking-widest">{t('billing.mode_label')}</h2>
                <p className="text-xs text-text3">{t('billing.mode_hint')}</p>
              </div>
              <BillingModeSelector
                value={billingMode}
                onChange={setBillingMode}
                defaultRate={
                  rateType === 'standard' ? (cafe?.default_rate ?? 0)
                  : rateType === 'premium' ? (cafe?.premium_rate ?? 0)
                  : customRate
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-bg via-bg to-transparent pt-12 z-50">
        <AnimatePresence>
          {canProceed && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="mb-4 p-4 bg-surface2 border border-accent-border rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[10px] text-text3 font-bold uppercase tracking-widest mb-1">Aperçu</div>
                <div className="text-sm font-bold text-text">{customerName} — Place {selectedSeat}</div>
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

        {step === 'details' ? (
          <Button
            onClick={() => setStep('billing')}
            className="w-full h-14 text-lg"
            disabled={!canProceed}
          >
            Choisir le mode de facturation →
          </Button>
        ) : (
          <Button
            onClick={handleStartSession}
            className="w-full h-14 text-lg"
            disabled={!canProceed}
            isLoading={isLoading}
          >
            <Play size={20} className="fill-current" />
            {t('sessions.start')}
          </Button>
        )}
      </div>
    </div>
  )
}
