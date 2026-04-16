import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useTranslation } from '../i18n'
import { useLanguageStore } from '../i18n'
import { Globe, ArrowRight, CheckCircle2, BarChart3, Users, Zap } from 'lucide-react'

export default function WelcomePage() {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguageStore()
  const navigate = useNavigate()

  const toggleLanguage = () => {
    const nextLang = language === 'fr' ? 'en' : 'fr'
    setLanguage(nextLang as any)
  }

  return (
    <div className="min-h-screen bg-bg text-text overflow-x-hidden font-sans">
      {/* Background Grid */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #ffffff 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      {/* Top Section */}
      <header className="fixed top-0 left-0 right-0 z-50 px-5 py-4 flex items-center justify-between bg-bg/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="Nook OS" className="w-7 h-7 drop-shadow-sm" />
          <span className="text-lg font-bold tracking-tight">Nook OS</span>
        </div>
        <div className="flex items-center">
          <button 
            onClick={toggleLanguage}
            className="flex items-center px-3 py-1.5 rounded-full bg-surface/50 border border-border text-xs font-bold tracking-wide transition-colors"
          >
            <span className={language === 'fr' ? 'text-accent' : 'text-text3'}>FR</span>
            <span className="text-text3 mx-1.5 font-medium">/</span>
            <span className={language === 'en' ? 'text-accent' : 'text-text3'}>EN</span>
          </button>
        </div>
      </header>

      <main className="pt-24 pb-20 px-5 max-w-md mx-auto relative z-10">
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center mt-4"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent2 text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            {t('welcome.tag')}
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-text3">
            {t('welcome.hero_title')}
          </h1>
          
          <p className="text-base text-text2 mb-8 max-w-[280px] mx-auto leading-relaxed">
            {t('welcome.hero_subtitle')}
          </p>

          <button 
            onClick={() => navigate('/register')}
            className="w-full h-14 rounded-xl bg-gradient-to-br from-accent to-[#ea6b0a] text-white font-bold text-lg shadow-[0_4px_20px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            {t('welcome.start_free')}
            <ArrowRight size={20} />
          </button>
        </motion.div>

        {/* Quick Proof */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-10 flex flex-col gap-3"
        >
          {[
            t('welcome.proof_1'),
            t('welcome.proof_2'),
            t('welcome.proof_3')
          ].map((proof, i) => (
            <div key={i} className="flex items-center justify-center gap-2 text-sm font-medium text-text2">
              <span className="text-text3">{proof}</span>
            </div>
          ))}
        </motion.div>

        {/* Features (Stacked Cards) */}
        <div className="mt-20 space-y-4">
          <FeatureCard 
            icon={<CheckCircle2 className="text-accent" size={24} />}
            title={t('welcome.feat1_title')}
            desc={t('welcome.feat1_desc')}
            delay={0.1}
          />
          <FeatureCard 
            icon={<BarChart3 className="text-accent" size={24} />}
            title={t('welcome.feat2_title')}
            desc={t('welcome.feat2_desc')}
            delay={0.2}
          />
          <FeatureCard 
            icon={<Users className="text-accent" size={24} />}
            title={t('welcome.feat3_title')}
            desc={t('welcome.feat3_desc')}
            delay={0.3}
          />
        </div>

        {/* Final CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 mb-10 text-center"
        >
          <button 
            onClick={() => navigate('/register')}
            className="w-full h-14 rounded-xl bg-gradient-to-br from-accent to-[#ea6b0a] text-white font-bold text-lg shadow-[0_4px_20px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            {t('welcome.start_free')}
            <ArrowRight size={20} />
          </button>
        </motion.div>

      </main>
    </div>
  )
}

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay, duration: 0.4 }}
      className="bg-surface border border-border rounded-2xl p-5 flex items-start gap-4 shadow-sm"
    >
      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-text mb-1">{title}</h3>
        <p className="text-sm text-text2 leading-snug">{desc}</p>
      </div>
    </motion.div>
  )
}
