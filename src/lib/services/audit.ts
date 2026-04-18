/**
 * Audit log service — centralised logging for all staff actions.
 */
import { supabase } from '../supabase'
import { AuditLog } from '../../types'

export interface LogActionPayload {
  cafeId: string
  staffId: string | null
  isOwner: boolean
  action: string
  details?: Record<string, unknown>
}

/** Write an audit log entry. Errors are swallowed so they never block the main action. */
export async function logAuditAction(payload: LogActionPayload): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      cafe_id: payload.cafeId,
      staff_id: payload.staffId,
      is_owner: payload.isOwner,
      action: payload.action,
      details: payload.details ?? {},
    })
  } catch (err) {
    // Audit failures must never break the main flow
    console.error('[audit] Failed to log action:', payload.action, err) // DEBUG
  }
}

/** Fetch audit log entries for a cafe, most recent first. */
export async function getAuditLog(cafeId: string, limit = 100): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}
