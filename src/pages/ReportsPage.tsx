import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { 
  BarChart2, TrendingUp, Users, Clock, 
  Download, Banknote, CreditCard, Wallet, Gift,
  Calendar, ChevronDown, Loader2, Activity
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useTranslation } from '../i18n'
import { Session } from '../types'
import { TopBar } from '../components/layout/TopBar'
import { BottomNav } from '../components/layout/BottomNav'
import { Button } from '../components/ui/Button'
import { generateReportPDF } from '../lib/pdf'
import { format, startOfDay, subDays, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ReportsPage() {
  const { t } = useTranslation()
  const { cafe } = useAuthStore()
  
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week')

  useEffect(() => {
    const loadData = async () => {
      if (!cafe) return
      setIsLoading(true)
      
      let startDate = startOfDay(new Date())
      if (period === 'week') startDate = subDays(startDate, 7)
      if (period === 'month') startDate = subMonths(startDate, 1)

      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('cafe_id', cafe.id)
        .eq('status', 'completed')
        .gte('ended_at', startDate.toISOString())
        .order('ended_at', { ascending: true })
      
      if (data) setSessions(data)
      setIsLoading(false)
    }

    loadData()
  }, [cafe, period])

  const stats = {
    revenue: sessions.reduce((acc, s) => acc + s.total_amount, 0),
    count: sessions.length,
    avgDuration: sessions.length > 0 
      ? Math.round(sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) / sessions.length)
      : 0,
    payments: sessions.reduce((acc: any, s) => {
      const method = s.payment_method || 'other'
      acc[method] = (acc[method] || 0) + s.total_amount
      return acc
    }, {})
  }

  const itemSales = sessions.reduce((acc: Record<string, {name: string, qty: number}>, s) => {
    if (Array.isArray(s.extras)) {
      s.extras.forEach((extra: any) => {
        if (!acc[extra.id]) {
          acc[extra.id] = { name: extra.name, qty: 0 }
        }
        acc[extra.id].qty += extra.qty
      })
    }
    return acc
  }, {})

  const bestSellingItem = (Object.values(itemSales) as {name: string, qty: number}[]).sort((a, b) => b.qty - a.qty)[0]

  // Chart Data
  const chartData = sessions.reduce((acc: any[], s) => {
    const date = format(new Date(s.ended_at!), 'dd/MM')
    const existing = acc.find(d => d.date === date)
    if (existing) {
      existing.revenue += s.total_amount
    } else {
      acc.push({ date, revenue: s.total_amount })
    }
    return acc
  }, [])

  const handleExport = () => {
    if (!cafe) return
    generateReportPDF(cafe, sessions, period === 'today' ? "Aujourd'hui" : period === 'week' ? "7 derniers jours" : "30 derniers jours")
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg/90 backdrop-blur-xl border-b border-border z-[100] flex items-center justify-between px-4">
        <h1 className="text-sm font-bold text-text">{t('reports.title')}</h1>
        <button onClick={handleExport} className="p-2 -mr-2 text-accent hover:text-accent2 transition-colors">
          <Download size={20} />
        </button>
      </header>

      <main className="pt-20 px-4 space-y-6">
        {/* Period Filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'today', label: t('common.today') },
            { id: 'week', label: t('common.thisWeek') },
            { id: 'month', label: t('common.thisMonth') },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                period === p.id 
                  ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' 
                  : 'bg-surface2 text-text3 border-border hover:border-text3'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Basic Analytics Grid */}
        <div className="grid grid-cols-2 gap-3 sticky top-14 pt-2 pb-2 bg-bg z-50">
          <div className="bg-surface border border-border p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 text-text3 text-[10px] font-bold uppercase tracking-widest mb-1">
              <Banknote size={12} className="text-accent" />
              Revenu Total
            </div>
            <div className="text-xl font-mono font-bold text-accent2">{stats.revenue.toFixed(2)} DH</div>
          </div>
          <div className="bg-surface border border-border p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 text-text3 text-[10px] font-bold uppercase tracking-widest mb-1">
              <Activity size={12} className="text-text2" />
              Commandes
            </div>
            <div className="text-xl font-mono font-bold text-text">{stats.count}</div>
          </div>
          <div className="bg-surface border border-border p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 text-text3 text-[10px] font-bold uppercase tracking-widest mb-1">
              <Clock size={12} className="text-text2" />
              Durée Moy.
            </div>
            <div className="text-xl font-mono font-bold text-text">{stats.avgDuration} min</div>
          </div>
          <div className="bg-surface border border-border p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 text-text3 text-[10px] font-bold uppercase tracking-widest mb-1">
              <TrendingUp size={12} className="text-text2" />
              Top Article
            </div>
            <div className="text-sm font-bold text-text truncate mt-1">
              {bestSellingItem ? `${bestSellingItem.name} (${bestSellingItem.qty})` : '-'}
            </div>
          </div>
        </div>

        {/* Payment Breakdown */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-text">{t('reports.payment_breakdown')}</h3>
          <div className="bg-surface border border-border rounded-2xl p-4 space-y-4">
            {[
              { id: 'cash', icon: Banknote, label: t('sessions.cash'), color: '#10b981' },
              { id: 'card', icon: CreditCard, label: t('sessions.card'), color: '#3b82f6' },
              { id: 'account', icon: Wallet, label: t('sessions.account'), color: '#f59e0b' },
              { id: 'free', icon: Gift, label: t('sessions.free'), color: '#ef4444' },
            ].map(method => {
              const amount = stats.payments[method.id] || 0
              const percentage = stats.revenue > 0 ? (amount / stats.revenue) * 100 : 0
              return (
                <div key={method.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs font-medium text-text2">
                      <method.icon size={14} style={{ color: method.color }} />
                      {method.label}
                    </div>
                    <div className="text-xs font-mono font-bold text-text">{amount.toFixed(2)} DH</div>
                  </div>
                  <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: method.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <Button variant="ghost" className="w-full h-12" onClick={handleExport}>
          <Download size={18} />
          {t('reports.export_pdf')}
        </Button>
      </main>

      <BottomNav />
    </div>
  )
}
