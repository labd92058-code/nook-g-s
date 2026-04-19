/**
 * Session service — all Supabase queries for sessions go through here.
 * Components must NOT run raw queries; use these functions instead.
 */
import { supabase } from '../supabase'
import { Session, BillingMode } from '../../types'

/** Fetch all active sessions for a given cafe. */
export async function getActiveSessions(cafeId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('cafe_id', cafeId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/** Fetch a single session by ID. Throws if not found. */
export async function getSession(id: string): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/** Fetch completed sessions for a cafe within a date range (for reports). */
export async function getCompletedSessions(
  cafeId: string,
  from: Date,
  limit = 500
): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, total_amount, ended_at, started_at, seat_number, customer_name, duration_minutes, payment_method, status, billing_mode, time_cost, extras_total')
    .eq('cafe_id', cafeId)
    .eq('status', 'completed')
    .gte('ended_at', from.toISOString())
    .order('ended_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data as Session[]) ?? []
}

/** Fetch all sessions for a specific client account. */
export async function getSessionsByClient(clientId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('client_account_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Session[]) ?? []
}

/** Fetch recent distinct customer names for autocomplete. */
export async function getRecentCustomerNames(cafeId: string, max = 6): Promise<string[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('customer_name')
    .eq('cafe_id', cafeId)
    .order('started_at', { ascending: false })
    .limit(100)

  if (error) throw error

  const seen = new Set<string>()
  const unique: string[] = []
  for (const row of data ?? []) {
    if (!seen.has(row.customer_name) && unique.length < max) {
      seen.add(row.customer_name)
      unique.push(row.customer_name)
    }
  }
  return unique
}

export interface StartSessionPayload {
  cafeId: string
  staffId: string | null
  clientAccountId: string | null
  customerName: string
  customerPhone: string | null
  seatNumber: number
  ratePerHour: number
  billingMode: BillingMode
  notes: string | null
}

/** Create a new session. start_at is always generated server-side via DEFAULT now(). */
export async function startSession(payload: StartSessionPayload): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      cafe_id: payload.cafeId,
      staff_id: payload.staffId,
      client_account_id: payload.clientAccountId,
      customer_name: payload.customerName,
      customer_phone: payload.customerPhone,
      seat_number: payload.seatNumber,
      rate_per_hour: payload.ratePerHour,
      billing_mode: payload.billingMode,
      status: 'active',
      notes: payload.notes,
      extras: [],
      extras_total: 0,
      total_amount: 0,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export interface EndSessionPayload {
  sessionId: string
  durationMinutes: number
  timeCost: number
  totalAmount: number
  paymentMethod: string
  amountReceived?: number
  changeGiven?: number
}

/**
 * Close a session and record final billing.
 * BILLING RULE: totalAmount must be computed by the caller according to billing_mode.
 * - 'time': totalAmount = timeCost (+ 0 for consumptions)
 * - 'consumption': totalAmount = sum(consumptions), timeCost is informational only
 */
export async function endSession(payload: EndSessionPayload): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      // BILLING BUG fix: use Math.floor to avoid floating-point drift in duration
      duration_minutes: Math.max(0, Math.floor(payload.durationMinutes)),
      // BILLING BUG fix: round to 2 decimal places, never negative
      time_cost: Math.max(0, Math.round(payload.timeCost * 100) / 100),
      total_amount: Math.max(0, Math.round(payload.totalAmount * 100) / 100),
      payment_method: payload.paymentMethod,
      amount_received: payload.amountReceived ?? null,
      change_given: payload.changeGiven ?? null,
    })
    .eq('id', payload.sessionId)

  if (error) throw error
}

/** Cancel a session (owner only). */
export async function cancelSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ status: 'cancelled', ended_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) throw error
}

/** Add extras to a session (append, never replace). */
export async function addExtrasToSession(
  session: Session,
  extras: Array<{ id: string; name: string; price: number; qty: number }>
): Promise<Session> {
  const existing = Array.isArray(session.extras) ? (session.extras as typeof extras) : []
  const newExtras = [...existing, ...extras]
  const newExtrasTotal = Math.round(
    (session.extras_total + extras.reduce((s, e) => s + e.price * e.qty, 0)) * 100
  ) / 100

  const { data, error } = await supabase
    .from('sessions')
    .update({ extras: newExtras as any, extras_total: newExtrasTotal })
    .eq('id', session.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/** Remove a single extra by index. */
export async function removeExtraFromSession(session: Session, index: number): Promise<Session> {
  const existing = [...(session.extras as any[])]
  const [removed] = existing.splice(index, 1)
  const newExtrasTotal = Math.max(
    0,
    Math.round((session.extras_total - removed.price * removed.qty) * 100) / 100
  )

  const { data, error } = await supabase
    .from('sessions')
    .update({ extras: existing as any, extras_total: newExtrasTotal })
    .eq('id', session.id)
    .select()
    .single()

  if (error) throw error
  return data
}
