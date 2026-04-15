import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useSessionStore } from '../stores/sessionStore'

export const useRealtime = () => {
  const { cafe } = useAuthStore()
  const { setActiveSessions, addSession, updateSession, removeSession } = useSessionStore()

  useEffect(() => {
    if (!cafe) return

    // Initial load
    const loadSessions = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('cafe_id', cafe.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
      
      if (data) setActiveSessions(data)
    }

    loadSessions()

    // Realtime subscription
    const channel = supabase
      .channel(`sessions-cafe-${cafe.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `cafe_id=eq.${cafe.id}`,
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload
          
          if (eventType === 'INSERT') {
            if ((newRow as any).status === 'active') {
              addSession(newRow as any)
            }
          } else if (eventType === 'UPDATE') {
            if ((newRow as any).status === 'active') {
              updateSession(newRow as any)
            } else {
              removeSession((oldRow as any).id)
            }
          } else if (eventType === 'DELETE') {
            removeSession((oldRow as any).id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [cafe])
}
