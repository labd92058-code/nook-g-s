import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { 
  ChevronLeft, Plus, User, Key, Timer, 
  BarChart2, Users, Settings, Trash2, Loader2, Check,
  Search, Filter, Power
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTranslation } from '../i18n'
import { Staff } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { BottomSheet } from '../components/ui/BottomSheet'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { NumPad } from '../components/ui/NumPad'
import { PINDots } from '../components/ui/PINDots'
import { hashPIN } from '../lib/crypto'

export default function StaffManagementPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cafe } = useAuthStore()
  const addToast = useUIStore((state) => state.addToast)

  const [staffList, setStaffList] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [showEdit, setShowEdit] = useState(false)

  // New Staff Form
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [permissions, setPermissions] = useState({
    sessions: true,
    reports: false,
    clients: false,
    settings: false
  })
  const [isActive, setIsActive] = useState(true)

  const loadStaff = async () => {
    if (!cafe) return
    setIsLoading(true)
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('cafe_id', cafe.id)
      .order('created_at', { ascending: false })
    if (data) setStaffList(data)
    setIsLoading(false)
  }

  useEffect(() => {
    loadStaff()
  }, [cafe])

  const handleAddStaff = async () => {
    if (!cafe || !name || pin.length < 4) return
    setIsSaving(true)
    try {
      const pinHash = await hashPIN(pin)
      const { error } = await supabase
        .from('staff' as any)
        .insert({
          cafe_id: cafe.id,
          name,
          pin_hash: pinHash,
          permissions,
          active: true
        })
      
      if (error) throw error
      
      addToast("Employé ajouté", "success")
      setShowAdd(false)
      setName('')
      setPin('')
      setPermissions({ sessions: true, reports: false, clients: false, settings: false })
      setIsActive(true)
      loadStaff()
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffToDelete.id)
      
      if (error) throw error
      
      addToast("Employé supprimé", "success")
      setStaffToDelete(null)
      loadStaff()
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleStaffActive = async (staff: Staff) => {
    try {
      const { error } = await supabase
        .from('staff' as any)
        .update({ active: !staff.active })
        .eq('id', staff.id)
      
      if (error) throw error
      loadStaff()
      addToast(staff.active ? "Employé désactivé" : "Employé activé", "success")
    } catch (error: any) {
      addToast(error.message, 'error')
    }
  }

  const handleUpdateStaff = async () => {
    if (!editingStaff || !name) return
    setIsSaving(true)
    try {
      const updateData: any = {
        name,
        permissions,
        active: isActive
      }
      
      // Only update PIN if provided
      if (pin.length === 4) {
        updateData.pin_hash = await hashPIN(pin)
      }

      const { error } = await supabase
        .from('staff' as any)
        .update(updateData)
        .eq('id', editingStaff.id)
      
      if (error) throw error
      
      addToast("Employé mis à jour", "success")
      setShowEdit(false)
      setEditingStaff(null)
      setName('')
      setPin('')
      setPermissions({ sessions: true, reports: false, clients: false, settings: false })
      setIsActive(true)
      loadStaff()
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const openEdit = (staff: Staff) => {
    setEditingStaff(staff)
    setName(staff.name)
    setPermissions(staff.permissions as any)
    setIsActive(staff.active)
    setPin('')
    setShowEdit(true)
  }

  const togglePermission = (key: keyof typeof permissions) => {
    if (key === 'sessions') return // Always required
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = statusFilter === 'all' || 
                         (statusFilter === 'active' && staff.active) || 
                         (statusFilter === 'inactive' && !staff.active)
    return matchesSearch && matchesFilter
  })

  return (
    <div className="min-h-screen bg-bg pb-12">
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/90 backdrop-blur-xl border-b border-border z-[100] flex items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text3 hover:text-text">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-sm font-bold text-text">Mon équipe</h1>
        <button onClick={() => setShowAdd(true)} className="p-2 -mr-2 text-accent hover:text-accent2">
          <Plus size={20} />
        </button>
      </header>

      <main className="pt-20 px-4 space-y-4">
        <div className="space-y-3">
          <Input
            placeholder="Rechercher un employé..."
            icon={<Search size={18} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'active', label: 'Actifs' },
              { id: 'inactive', label: 'Inactifs' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                  statusFilter === f.id 
                    ? 'bg-accent text-white border-accent' 
                    : 'bg-surface2 text-text3 border-border'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredStaff.map((staff) => (
          <div key={staff.id} className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-surface2 rounded-full flex items-center justify-center text-text3">
                <User size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-text">{staff.name}</div>
                <div className="flex gap-1.5 mt-1">
                  {(staff.permissions as any).sessions && <Timer size={10} className="text-accent" />}
                  {(staff.permissions as any).reports && <BarChart2 size={10} className="text-info" />}
                  {(staff.permissions as any).clients && <Users size={10} className="text-success" />}
                  {(staff.permissions as any).settings && <Settings size={10} className="text-warning" />}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => openEdit(staff)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors ${
                  staff.active ? 'bg-success-dim text-success hover:bg-success/20' : 'bg-surface2 text-text3 hover:bg-surface3'
                }`}
              >
                {staff.active ? 'Actif' : 'Inactif'}
              </button>
              <button 
                onClick={() => toggleStaffActive(staff)}
                className={`p-2 rounded-lg transition-colors ${staff.active ? 'text-success hover:bg-success/10' : 'text-text3 hover:bg-surface2'}`}
                title={staff.active ? "Désactiver" : "Activer"}
              >
                <Power size={18} />
              </button>
              <button 
                onClick={() => setStaffToDelete(staff)}
                className="p-2 text-text3 hover:text-error transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {filteredStaff.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-text3">
            <Users size={40} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">
              {search || statusFilter !== 'all' ? "Aucun employé ne correspond à votre recherche" : "Aucun employé ajouté"}
            </p>
          </div>
        )}
      </main>

      <BottomSheet 
        isOpen={showAdd || showEdit} 
        onClose={() => {
          setShowAdd(false)
          setShowEdit(false)
          setEditingStaff(null)
          setName('')
          setPin('')
          setPermissions({ sessions: true, reports: false, clients: false, settings: false })
          setIsActive(true)
        }} 
        title={showEdit ? "Modifier l'employé" : "Nouvel employé"}
      >
        <div className="space-y-8 pt-4">
          <Input
            placeholder="Nom de l'employé"
            icon={<User size={18} />}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="flex flex-col items-center gap-4">
            <label className="text-xs font-bold text-text3 uppercase tracking-widest">
              {showEdit ? "Nouveau PIN (optionnel)" : "Code PIN (4 chiffres)"}
            </label>
            <PINDots length={pin.length} />
            <NumPad
              onPress={(v) => pin.length < 4 && setPin(pin + v)}
              onDelete={() => setPin(pin.slice(0, -1))}
              className="w-full"
            />
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold text-text3 uppercase tracking-widest">Statut du compte</label>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                isActive ? 'bg-success-dim border-success/30' : 'bg-surface2 border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-success text-white' : 'bg-text3 text-white'}`}>
                  <Check size={16} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-text">{isActive ? 'Compte Actif' : 'Compte Inactif'}</div>
                  <div className="text-[10px] text-text3">L'employé {isActive ? 'peut' : 'ne peut plus'} se connecter</div>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${isActive ? 'bg-success' : 'bg-border'}`}>
                <motion.div 
                  animate={{ x: isActive ? 22 : 2 }}
                  className="absolute top-1 w-3 h-3 bg-white rounded-full"
                />
              </div>
            </button>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold text-text3 uppercase tracking-widest">Droits d'accès</label>
            <div className="space-y-2">
              {[
                { id: 'sessions', icon: Timer, label: 'Gérer les sessions', locked: true },
                { id: 'reports', icon: BarChart2, label: 'Voir les rapports' },
                { id: 'clients', icon: Users, label: 'Gérer les clients' },
                { id: 'settings', icon: Settings, label: 'Paramètres' },
              ].map(perm => (
                <button
                  key={perm.id}
                  onClick={() => togglePermission(perm.id as any)}
                  className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                    permissions[perm.id as keyof typeof permissions] ? 'bg-accent-glow border-accent' : 'bg-surface2 border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <perm.icon size={18} className={permissions[perm.id as keyof typeof permissions] ? 'text-accent' : 'text-text3'} />
                    <div className="text-left">
                      <div className="text-sm font-bold text-text">{perm.label}</div>
                      {perm.locked && <div className="text-[10px] text-text3 italic">Toujours activé</div>}
                    </div>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${
                    permissions[perm.id as keyof typeof permissions] ? 'bg-accent' : 'bg-border'
                  }`}>
                    <motion.div 
                      animate={{ x: permissions[perm.id as keyof typeof permissions] ? 22 : 2 }}
                      className="absolute top-1 w-3 h-3 bg-white rounded-full"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button 
            className="w-full h-14" 
            onClick={showEdit ? handleUpdateStaff : handleAddStaff}
            isLoading={isSaving}
            disabled={!name || (!showEdit && pin.length < 4)}
          >
            {showEdit ? "Enregistrer les modifications" : "Créer l'employé"}
          </Button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={staffToDelete !== null}
        onClose={() => setStaffToDelete(null)}
        onConfirm={handleDeleteStaff}
        title="Supprimer l'employé ?"
        message={`Voulez-vous vraiment supprimer ${staffToDelete?.name} ? Cette action est irréversible.`}
        variant="danger"
        confirmLabel={isDeleting ? "Suppression..." : "Supprimer"}
      />
    </div>
  )
}
