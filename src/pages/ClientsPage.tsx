/**
 * SCALABILITY: All Supabase queries now go through the service layer (lib/services/clients.ts).
 * No raw supabase calls in this component.
 */
import * as React from 'react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Search, UserPlus, Wallet, Phone, FileText, 
  ChevronRight, Plus, Loader2, User
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../i18n'
import { ClientAccount } from '../types'
import { getClients, createClient } from '../lib/services/clients'
import { TopBar } from '../components/layout/TopBar'
import { BottomNav } from '../components/layout/BottomNav'
import { Input } from '../components/ui/Input'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { BottomSheet } from '../components/ui/BottomSheet'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ClientsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe } = useAuthStore()
  const addToast = useUIStore((state) => state.addToast)
  
  const [clients, setClients] = useState<ClientAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewClient, setShowNewClient] = useState(false)
  const [filter, setFilter] = useState<'all' | 'positive' | 'low'>('all')

  // New client form
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newBalance, setNewBalance] = useState(0)
  const [newNotes, setNewNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadClients = async () => {
    if (!cafe) return
    setIsLoading(true)
    try {
      const data = await getClients(cafe.id)
      setClients(data)
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [cafe])

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cafe || !newName) return
    setIsSaving(true)
    try {
      await createClient({
        cafeId: cafe.id,
        name: newName,
        phone: newPhone || null,
        balance: newBalance,
        notes: newNotes || null,
      })

      addToast("Compte client créé", "success")
      setShowNewClient(false)
      setNewName('')
      setNewPhone('')
      setNewBalance(0)
      setNewNotes('')
      loadClients()
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search))
    if (!matchesSearch) return false
    if (filter === 'positive') return c.balance > 0
    if (filter === 'low') return c.balance < 10
    return true
  })

  return (
    <div className="min-h-screen bg-bg pb-24">
      <TopBar />

      <main className="pt-20 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-text">{t('clients.title')}</h1>
        </div>

        <Input
          placeholder="Rechercher un client..."
          icon={<Search size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: t('common.all') },
            { id: 'positive', label: 'Solde positif' },
            { id: 'low', label: 'Faible solde' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setFilter(p.id as any)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                filter === p.id 
                  ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' 
                  : 'bg-surface2 text-text3 border-border hover:border-text3'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredClients.map((client) => (
            <motion.div
              key={client.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-text3 transition-all"
            >
              <div className="flex items-center gap-4">
                <Avatar name={client.name} />
                <div>
                  <div className="text-sm font-bold text-text">{client.name}</div>
                  <div className="text-[10px] text-text3 font-medium">
                    Dernière visite: {formatDistanceToNow(new Date(client.updated_at), { addSuffix: true, locale: fr })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`text-sm font-mono font-bold ${
                    client.balance > 50 ? 'text-success' : client.balance < 10 ? 'text-error' : 'text-warning'
                  }`}>
                    {client.balance.toFixed(2)} DH
                  </div>
                  <div className="text-[10px] text-text3 font-bold uppercase tracking-widest">{t('clients.balance')}</div>
                </div>
                <ChevronRight size={16} className="text-text3" />
              </div>
            </motion.div>
          ))}

          {filteredClients.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-text3">
              <Wallet size={40} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">Aucun client trouvé</p>
            </div>
          )}
        </div>
      </main>

      <button
        onClick={() => setShowNewClient(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-linear-to-br from-accent to-[#ea6b0a] rounded-full flex items-center justify-center text-white shadow-2xl shadow-accent/40 z-50 active:scale-90 transition-all"
      >
        <UserPlus size={24} />
      </button>

      <BottomSheet isOpen={showNewClient} onClose={() => setShowNewClient(false)} title={t('clients.new')}>
        <form onSubmit={handleCreateClient} className="space-y-6 pt-4">
          <Input
            placeholder="Nom du client"
            icon={<User size={18} />}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <Input
            type="tel"
            placeholder="Téléphone (optionnel)"
            icon={<Phone size={18} />}
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
          />
          <div className="space-y-2">
            <label className="text-xs font-bold text-text3 uppercase tracking-widest">Solde initial en DH</label>
            <Input
              type="number"
              placeholder="0.00"
              icon={<Wallet size={18} />}
              value={newBalance || ''}
              onChange={(e) => setNewBalance(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-text3 uppercase tracking-widest">Notes</label>
            <textarea
              className="input h-24 py-3 resize-none"
              placeholder="Informations complémentaires..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full h-14" isLoading={isSaving}>
            Créer le compte
          </Button>
        </form>
      </BottomSheet>

      <BottomNav />
    </div>
  )
}
