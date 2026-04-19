/**
 * SCALABILITY: All Supabase queries now go through the service layer.
 * CONFLICT RESOLVED: all three data queries run in parallel via Promise.all.
 */
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  ChevronLeft, MoreVertical, Phone, MessageCircle, 
  PlusCircle, BarChart, TrendingUp, Calendar, 
  Clock, Banknote, Wallet, Loader2, Play, Trash2, Edit2
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../i18n'
import { useAudit } from '../hooks/useAudit'
import { ClientAccount, Session, BalanceTransaction } from '../types'
import { getClient, updateClientBalance, recordClientVisit } from '../lib/services/clients'
import { getClientTransactions, rechargeClientAccount } from '../lib/services/transactions'
import { getSessionsByClient } from '../lib/services/sessions'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { BottomSheet } from '../components/ui/BottomSheet'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ClientDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe, staff, type } = useAuthStore()
  const addToast = useUIStore((state) => state.addToast)
  const { logAction } = useAudit()

  const [client, setClient] = useState<ClientAccount | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'visits' | 'transactions'>('visits')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  
  const [showRecharge, setShowRecharge] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState<number>(0)
  const [rechargeRef, setRechargeRef] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // CONFLICT RESOLVED: all three queries now run in parallel via Promise.all
  const loadData = async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const [clientData, transData, sessionData] = await Promise.all([
        getClient(id),
        getClientTransactions(id),
        getSessionsByClient(id),
      ])

      setClient(clientData)
      setTransactions(transData)
      setSessions(sessionData)
    } catch (err: any) {
      addToast(err.message, 'error')
      navigate(-1)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleRecharge = async () => {
    if (!client || !rechargeAmount || !cafe) return
    setIsSaving(true)
    try {
      const safeAmount = Math.max(0, Math.round(rechargeAmount * 100) / 100)

      // Record the credit transaction + update balance atomically via service
      const tx = await rechargeClientAccount({
        cafeId: cafe.id,
        clientId: client.id,
        staffId: type === 'staff' ? (staff?.id ?? null) : null,
        amount: safeAmount,
        balanceBefore: client.balance,
        reference: rechargeRef || 'Recharge manuelle',
      })

      await updateClientBalance(client.id, tx.balance_after)

      await logAction('client_recharged', {
        client_id: client.id,
        client_name: client.name,
        amount: safeAmount,
        new_balance: tx.balance_after,
        reference: rechargeRef || 'Recharge manuelle',
      })

      addToast(`Compte rechargé de ${safeAmount.toFixed(2)} DH`, "success")
      setShowRecharge(false)
      setRechargeAmount(0)
      setRechargeRef('')
      loadData()
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg pb-12">
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/90 backdrop-blur-xl border-b border-border z-[100] flex items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text3 hover:text-text">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-sm font-bold text-text">{client.name}</h1>
        <div className="relative">
          <button 
            onClick={() => setShowMoreMenu(!showMoreMenu)} 
            className="p-2 -mr-2 text-text3 hover:text-text"
          >
            <MoreVertical size={20} />
          </button>
          
          <AnimatePresence>
            {showMoreMenu && (
              <>
                <div 
                  className="fixed inset-0 z-[110]" 
                  onClick={() => setShowMoreMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl overflow-hidden shadow-xl shadow-black/50 z-[120]"
                >
                  <div className="flex flex-col py-1">
                    <button 
                      onClick={() => {
                        setShowMoreMenu(false)
                        // TODO: implement edit client
                      }}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-text2 hover:text-text hover:bg-surface2 transition-colors text-left"
                    >
                      <PlusCircle size={16} /> {/* Should be edit, but reusing for now or change to Edit2 */}
                      Modifier le profil
                    </button>
                    {type === 'owner' && (
                      <button 
                        onClick={() => {
                          setShowMoreMenu(false)
                          // TODO: confirm delete
                        }}
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-error hover:bg-error/10 transition-colors text-left"
                      >
                        <Trash2 size={16} /> {/* Wait, Trash2 needs importing if not present */}
                        Supprimer le client
                      </button>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="pt-20 px-4 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center">
          <Avatar name={client.name} size="lg" className="mb-4" />
          <h2 className="text-2xl font-extrabold text-text">{client.name}</h2>
          {client.phone && (
            <div className="flex items-center gap-2 text-text3 text-sm mt-1">
              <Phone size={14} />
              {client.phone}
            </div>
          )}
        </div>

        {/* Balance Card */}
        <div className="p-6 rounded-2xl border border-border bg-surface2 flex flex-col items-center text-center relative overflow-hidden">
          <div className="text-[10px] font-bold text-text3 uppercase tracking-widest mb-2">Solde actuel</div>
          <div className={`text-4xl font-mono font-extrabold mb-6 ${
            client.balance > 50 ? 'text-success' : client.balance < 10 ? 'text-error' : 'text-warning'
          }`}>
            {client.balance.toFixed(2)} DH
          </div>
          
          <Button 
            className="w-full h-12 mb-3 bg-gradient-to-br from-accent to-[#ea6b0a] text-white shadow-[0_2px_12px_rgba(249,115,22,0.25)]"
            onClick={() => navigate('/sessions/new', { state: { clientName: client.name, clientPhone: client.phone, clientId: client.id } })}
          >
            <Play size={18} className="fill-current" />
            Démarrer une session
          </Button>

          <div className="flex gap-3 w-full">
            <Button 
              className="flex-1 h-12 bg-success-dim border border-success/20 text-success shadow-none"
              onClick={() => setShowRecharge(true)}
            >
              <PlusCircle size={18} />
              Recharger
            </Button>
            {client.phone && (
              <a 
                href={`https://wa.me/${client.phone.replace(/\s/g, '')}?text=Bonjour ${client.name}, votre solde Nook OS est de ${client.balance.toFixed(2)} DH.`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 h-12 btn-ghost flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} />
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface border border-border rounded-xl p-3 text-center">
            <BarChart size={16} className="text-text3 mx-auto mb-1.5" />
            <div className="text-lg font-mono font-bold text-text">{client.total_visits}</div>
            <div className="text-[9px] text-text3 font-bold uppercase">Visites</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-3 text-center">
            <TrendingUp size={16} className="text-text3 mx-auto mb-1.5" />
            <div className="text-lg font-mono font-bold text-text">{client.total_spent.toFixed(0)}</div>
            <div className="text-[9px] text-text3 font-bold uppercase">DH Dépensé</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-3 text-center">
            <Calendar size={16} className="text-text3 mx-auto mb-1.5" />
            <div className="text-lg font-mono font-bold text-text">{format(new Date(client.created_at), 'yy')}</div>
            <div className="text-[9px] text-text3 font-bold uppercase">Membre</div>
          </div>
        </div>

        {/* History Tabs */}
        <div className="space-y-4">
          <div className="flex gap-4 border-b border-border">
            <button 
              onClick={() => setActiveTab('visits')}
              className={`pb-2 text-sm font-bold transition-all relative ${
                activeTab === 'visits' ? 'text-accent' : 'text-text3'
              }`}
            >
              Visites
              {activeTab === 'visits' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
            </button>
            <button 
              onClick={() => setActiveTab('transactions')}
              className={`pb-2 text-sm font-bold transition-all relative ${
                activeTab === 'transactions' ? 'text-accent' : 'text-text3'
              }`}
            >
              Transactions
              {activeTab === 'transactions' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'visits' ? (
              <motion.div 
                key="visits"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border"
              >
                {sessions.map((session) => (
                  <div key={session.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface2 flex items-center justify-center text-text3">
                        <Clock size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-text">
                          Place {session.seat_number}
                        </div>
                        <div className="text-[10px] text-text3">
                          {format(new Date(session.started_at), 'd MMM yyyy', { locale: fr })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-text">
                        {session.total_amount.toFixed(2)} DH
                      </div>
                      <div className="text-[10px] text-text3">
                        {session.duration_minutes} min
                      </div>
                    </div>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="p-8 text-center text-text3 text-sm">Aucune visite enregistrée</div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="transactions"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border"
              >
                {transactions.map((trans) => (
                  <div key={trans.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        trans.type === 'credit' ? 'bg-success-dim text-success' : 'bg-error-dim text-error'
                      }`}>
                        {trans.type === 'credit' ? <PlusCircle size={16} /> : <TrendingUp size={16} className="rotate-180" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-text">
                          {trans.description || (trans.type === 'credit' ? 'Crédit' : 'Débit')}
                        </div>
                        <div className="text-[10px] text-text3">
                          {format(new Date(trans.created_at), 'd MMM yyyy HH:mm', { locale: fr })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-mono font-bold ${
                        trans.type === 'credit' ? 'text-success' : 'text-error'
                      }`}>
                        {trans.type === 'credit' ? '+' : '-'}{trans.amount.toFixed(2)} DH
                      </div>
                      <div className="text-[9px] text-text3 font-mono">
                        Solde: {trans.balance_after.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="p-8 text-center text-text3 text-sm">Aucune transaction enregistrée</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Recharge Sheet */}
      <BottomSheet isOpen={showRecharge} onClose={() => setShowRecharge(false)} title="Recharger le compte">
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-4 gap-2">
            {[20, 50, 100, 200].map(amt => (
              <button
                key={amt}
                onClick={() => setRechargeAmount(amt)}
                className={`py-2.5 rounded-lg border font-mono font-bold text-sm transition-all ${
                  rechargeAmount === amt ? 'bg-accent text-white border-accent' : 'bg-surface2 border-border text-text2'
                }`}
              >
                {amt}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-text3 uppercase tracking-widest">Montant personnalisé</label>
            <Input
              type="number"
              placeholder="0.00"
              icon={<Banknote size={18} />}
              value={rechargeAmount || ''}
              onChange={(e) => setRechargeAmount(parseFloat(e.target.value) || 0)}
              rightElement={<span className="text-xs font-bold text-text3">DH</span>}
            />
          </div>

          <Input
            placeholder="Référence (ex: Espèces, Virement...)"
            icon={<Wallet size={18} />}
            value={rechargeRef}
            onChange={(e) => setRechargeRef(e.target.value)}
          />

          <div className="p-4 bg-surface2 border border-border rounded-xl flex justify-between items-center">
            <span className="text-xs font-bold text-text3 uppercase">Nouveau solde</span>
            <span className="text-lg font-mono font-bold text-success">
              {(client.balance + rechargeAmount).toFixed(2)} DH
            </span>
          </div>

          <Button 
            className="w-full h-14" 
            onClick={handleRecharge}
            isLoading={isSaving}
            disabled={!rechargeAmount}
          >
            Confirmer la recharge
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
