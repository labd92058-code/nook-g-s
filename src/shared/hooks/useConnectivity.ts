/**
 * useConnectivity — tracks real-time online/offline status.
 * Uses navigator.onLine as the base signal and verifies with a lightweight
 * Supabase ping so WiFi-connected-but-no-internet is detected correctly.
 *
 * NOTE: runSync is imported dynamically to avoid pulling Dexie into the
 * initial module graph, which caused React hook call failures in Vite dev mode.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface ConnectivityState {
  isOnline: boolean
  lastSyncAt: Date | null
  pendingCount: number
}

const PING_INTERVAL_MS = 15_000

export function useConnectivity(): ConnectivityState {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wasOfflineRef = useRef(typeof navigator !== 'undefined' ? !navigator.onLine : false)

  /** Confirm connectivity with a real Supabase request. */
  const verifyConnection = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase.from('cafes').select('id').limit(1)
      return !error
    } catch {
      return false
    }
  }, [])

  /** Trigger outbox sync when we come back online. */
  const triggerSync = useCallback(async () => {
    try {
      // Dynamic import keeps Dexie out of the initial bundle
      const { runSync } = await import('../../lib/offline/sync')
      const result = await runSync()
      if (result.processed > 0 || result.failed === 0) {
        setLastSyncAt(new Date())
        setPendingCount(0)
      }
    } catch {
      // Sync errors are non-fatal
    }
  }, [])

  const handleOnline = useCallback(async () => {
    const confirmed = await verifyConnection()
    setIsOnline(confirmed)
    if (confirmed && wasOfflineRef.current) {
      wasOfflineRef.current = false
      await triggerSync()
    }
  }, [verifyConnection, triggerSync])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
    wasOfflineRef.current = true
  }, [])

  useEffect(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    pingTimerRef.current = setInterval(async () => {
      if (navigator.onLine) {
        const ok = await verifyConnection()
        setIsOnline(ok)
        if (!ok) wasOfflineRef.current = true
      }
    }, PING_INTERVAL_MS)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (pingTimerRef.current) clearInterval(pingTimerRef.current)
    }
  }, [handleOnline, handleOffline, verifyConnection])

  return { isOnline, lastSyncAt, pendingCount }
}
