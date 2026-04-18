/**
 * BillingModeSelector — presented when opening a new session.
 * The billing mode cannot be changed once the session is started.
 */
import React from 'react'
import { motion } from 'motion/react'
import { Clock, ShoppingBag, Check } from 'lucide-react'
import { BillingMode } from '../../types'

interface Props {
  value: BillingMode
  onChange: (mode: BillingMode) => void
  defaultRate: number
}

const MODES: Array<{
  id: BillingMode
  icon: React.ElementType
  label: string
  description: string
  color: string
  accentClass: string
  borderClass: string
}> = [
  {
    id: 'time',
    icon: Clock,
    label: 'Facturation au temps',
    description: 'Le client paie selon la durée de sa session. Les consommations sont notées à titre indicatif mais ne s\'ajoutent pas à la facture.',
    color: '#f97316',
    accentClass: 'text-accent',
    borderClass: 'border-accent',
  },
  {
    id: 'consumption',
    icon: ShoppingBag,
    label: 'Facturation à la consommation',
    description: 'Le client paie uniquement ce qu\'il commande. Le temps est affiché pour votre usage mais n\'est jamais facturé.',
    color: '#3b82f6',
    accentClass: 'text-blue-400',
    borderClass: 'border-blue-500',
  },
]

export function BillingModeSelector({ value, onChange, defaultRate }: Props) {
  return (
    <div className="space-y-3">
      {MODES.map((mode) => {
        const isSelected = value === mode.id
        const Icon = mode.icon
        return (
          <motion.button
            key={mode.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(mode.id)}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
              isSelected
                ? `${mode.borderClass} bg-surface2`
                : 'border-border bg-surface hover:border-text3'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-opacity-20' : 'bg-surface2'
                }`}
                style={isSelected ? { backgroundColor: `${mode.color}20` } : {}}
              >
                <Icon size={20} style={{ color: isSelected ? mode.color : undefined }} className={isSelected ? '' : 'text-text3'} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-bold ${isSelected ? mode.accentClass : 'text-text'}`}>
                    {mode.label}
                  </span>
                  {isSelected && (
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: mode.color }}
                    >
                      <Check size={12} className="text-white" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text3 leading-relaxed">{mode.description}</p>
                {mode.id === 'time' && (
                  <div className="mt-2 text-[10px] font-mono font-bold text-text3">
                    Tarif : {defaultRate.toFixed(2)} DH/h
                  </div>
                )}
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
