import { motion } from 'motion/react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface PINDotsProps {
  length: number
  maxLength?: number
  className?: string
  error?: boolean
}

export const PINDots = ({ length, maxLength = 4, className, error }: PINDotsProps) => {
  return (
    <motion.div
      animate={error ? { x: [-4, 4, -4, 4, 0] } : {}}
      transition={{ duration: 0.4 }}
      className={cn('flex justify-center gap-4', className)}
    >
      {Array.from({ length: maxLength }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-3 h-3 rounded-full border-2 transition-all duration-200',
            i < length
              ? error
                ? 'bg-error border-error'
                : 'bg-accent border-accent scale-110 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
              : 'border-border'
          )}
        />
      ))}
    </motion.div>
  )
}
