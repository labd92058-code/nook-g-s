/**
 * Product service — all Supabase queries for the products catalog.
 */
import { supabase } from '../supabase'
import { Product, SessionConsumption } from '../../types'

/** Fetch all active products for a cafe, ordered by sort_order. */
export async function getActiveProducts(cafeId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('cafe_id', cafeId)
    .eq('active', true)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

/** Fetch all products (active + inactive) for the management page. */
export async function getAllProducts(cafeId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export interface CreateProductPayload {
  cafeId: string
  name: string
  price: number
  category: string
  sortOrder?: number
}

/** Add a new product to the catalog. */
export async function createProduct(payload: CreateProductPayload): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      cafe_id: payload.cafeId,
      name: payload.name,
      price: Math.max(0, payload.price),
      category: payload.category,
      sort_order: payload.sortOrder ?? 0,
      active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Toggle a product's active state. */
export async function toggleProductActive(
  productId: string,
  active: boolean
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ active })
    .eq('id', productId)

  if (error) throw error
}

/** Delete a product permanently. */
export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) throw error
}

// ─── Session consumptions (for consumption billing mode) ──────────────────────

/** Fetch all consumptions for a session. */
export async function getSessionConsumptions(sessionId: string): Promise<SessionConsumption[]> {
  const { data, error } = await supabase
    .from('session_consumptions')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Add a consumption line to a session (consumption billing mode). */
export async function addSessionConsumption(
  sessionId: string,
  productId: string,
  productName: string,
  quantity: number,
  unitPrice: number
): Promise<SessionConsumption> {
  const { data, error } = await supabase
    .from('session_consumptions')
    .insert({
      session_id: sessionId,
      product_id: productId,
      product_name: productName,
      quantity: Math.max(1, quantity),
      unit_price: Math.max(0, unitPrice),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Delete a consumption line (owner only). */
export async function deleteSessionConsumption(consumptionId: string): Promise<void> {
  const { error } = await supabase
    .from('session_consumptions')
    .delete()
    .eq('id', consumptionId)

  if (error) throw error
}
