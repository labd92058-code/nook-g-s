/**
 * Persistent banner shown when the app detects no internet connection.
 * Rendered at the top of the screen above all other content.
 */
import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { WifiOff, RefreshCw } from 'lucide-react'
import { useConnectivity } from '../hooks/useConnectivity'

export function OfflineBanner() {
  const { isOnline, lastSyncAt, pendingCount } = useConnectivity()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[200] bg-warning text-black px-4 py-2 flex items-center justify-between gap-3"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <WifiOff size={16} className="shrink-0" />
            <span className="text-xs font-bold">
              Mode hors-ligne
              {pendingCount > 0 && ` · ${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente`}
            </span>
          </div>
          {lastSyncAt && (
            <div className="flex items-center gap-1 text-[10px] opacity-70">
              <RefreshCw size={10} />
              {lastSyncAt.toLocaleTimeString()}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
