/**
 * Balance transaction service.
 * HARD RULE: consumption billing must NEVER include time_cost in the amount.
 */
import { supabase } from '../supabase'
import { BalanceTransaction, BillingMode, BillingBreakdown } from '../../types'

/** Fetch all transactions for a client account. */
export async function getClientTransactions(clientId: string): Promise<BalanceTransaction[]> {
  const { data, error } = await supabase
    .from('balance_transactions')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export interface RecordSessionPaymentPayload {
  cafeId: string
  clientId: string
  sessionId: string
  staffId: string | null
  amount: number
  balanceBefore: number
  billingMode: BillingMode
  breakdown: BillingBreakdown
}

/** Record a debit transaction when a session is paid from the client account. */
export async function recordSessionPayment(
  payload: RecordSessionPaymentPayload
): Promise<BalanceTransaction> {
  // HARD RULE: amount must always be non-negative
  const safeAmount = Math.max(0, Math.round(payload.amount * 100) / 100)
  const balanceAfter = Math.round((payload.balanceBefore - safeAmount) * 100) / 100

  const { data, error } = await supabase
    .from('balance_transactions')
    .insert({
      cafe_id: payload.cafeId,
      client_id: payload.clientId,
      session_id: payload.sessionId,
      staff_id: payload.staffId,
      type: 'debit',
      amount: safeAmount,
      balance_before: payload.balanceBefore,
      balance_after: balanceAfter,
      billing_mode: payload.billingMode,
      breakdown: payload.breakdown as any,
      description: payload.billingMode === 'time'
        ? 'Paiement session (temps)'
        : 'Paiement session (consommations)',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export interface RechargePayload {
  cafeId: string
  clientId: string
  staffId: string | null
  amount: number
  balanceBefore: number
  reference?: string
}

/** Record a credit transaction (manual recharge). */
export async function rechargeClientAccount(
  payload: RechargePayload
): Promise<BalanceTransaction> {
  const safeAmount = Math.max(0, Math.round(payload.amount * 100) / 100)
  const balanceAfter = Math.round((payload.balanceBefore + safeAmount) * 100) / 100

  const { data, error } = await supabase
    .from('balance_transactions')
    .insert({
      cafe_id: payload.cafeId,
      client_id: payload.clientId,
      staff_id: payload.staffId,
      type: 'credit',
      amount: safeAmount,
      balance_before: payload.balanceBefore,
      balance_after: balanceAfter,
      billing_mode: null,
      description: payload.reference || 'Recharge manuelle',
    })
    .select()
    .single()

  if (error) throw error
  return data
}
