import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'accent' | 'success' | 'error' | 'warning'
  className?: string
}

export const Badge = ({ children, variant = 'default', className }: BadgeProps) => {
  const variants = {
    default: 'bg-surface2 text-text3 border-border',
    accent: 'bg-accent-glow text-accent2 border-accent-border',
    success: 'bg-success-dim text-success border-success/20',
    error: 'bg-error-dim text-error border-error/20',
    warning: 'bg-warning-dim text-warning border-warning/20',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
