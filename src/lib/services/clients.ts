/**
 * Client account service — all Supabase queries for client_accounts go here.
 */
import { supabase } from '../supabase'
import { ClientAccount } from '../../types'

/** Fetch all client accounts for a cafe, ordered by most-recently updated. */
export async function getClients(cafeId: string): Promise<ClientAccount[]> {
  const { data, error } = await supabase
    .from('client_accounts')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/** Fetch a single client by ID. */
export async function getClient(id: string): Promise<ClientAccount> {
  const { data, error } = await supabase
    .from('client_accounts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export interface CreateClientPayload {
  cafeId: string
  name: string
  phone?: string | null
  balance?: number
  notes?: string | null
}

/** Create a new client account. Returns the created record. */
export async function createClient(payload: CreateClientPayload): Promise<ClientAccount> {
  const { data, error } = await supabase
    .from('client_accounts')
    .insert({
      cafe_id: payload.cafeId,
      name: payload.name,
      phone: payload.phone ?? null,
      balance: payload.balance ?? 0,
      notes: payload.notes ?? null,
      total_visits: 0,
      total_spent: 0,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Update a client's balance directly. Used in recharge flow. */
export async function updateClientBalance(
  clientId: string,
  newBalance: number
): Promise<void> {
  const { error } = await supabase
    .from('client_accounts')
    .update({ balance: Math.round(newBalance * 100) / 100 })
    .eq('id', clientId)

  if (error) throw error
}

/** Increment visit count and total spent after a session closes. */
export async function recordClientVisit(
  clientId: string,
  amountSpent: number
): Promise<void> {
  const { data: current, error: fetchErr } = await supabase
    .from('client_accounts')
    .select('total_visits, total_spent, balance')
    .eq('id', clientId)
    .single()

  if (fetchErr) throw fetchErr

  const { error } = await supabase
    .from('client_accounts')
    .update({
      total_visits: (current.total_visits ?? 0) + 1,
      total_spent: Math.round(((current.total_spent ?? 0) + amountSpent) * 100) / 100,
    })
    .eq('id', clientId)

  if (error) throw error
}
