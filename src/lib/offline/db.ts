/**
 * IndexedDB schema via Dexie.
 * Stores local copies of live data and an outbox queue for offline writes.
 */
import Dexie, { Table } from 'dexie'
import { Session, Product, SessionConsumption } from '../../types'

// ─── Outbox entry ─────────────────────────────────────────────────────────────
export type OutboxActionType =
  | 'start_session'
  | 'end_session'
  | 'cancel_session'
  | 'add_extras'
  | 'add_consumption'

export interface OutboxEntry {
  id?: number
  actionType: OutboxActionType
  payload: Record<string, unknown>
  createdAt: number
  retryCount: number
  failed: boolean
}

// ─── DB class ─────────────────────────────────────────────────────────────────
class NookDatabase extends Dexie {
  sessions!: Table<Session, string>
  products!: Table<Product, string>
  consumptions!: Table<SessionConsumption, string>
  outbox!: Table<OutboxEntry, number>

  constructor() {
    super('NookOS')

    this.version(1).stores({
      sessions: 'id, cafe_id, status, started_at',
      products: 'id, cafe_id, active',
      consumptions: 'id, session_id',
      outbox: '++id, actionType, createdAt, failed',
    })
  }
}

export const db = new NookDatabase()

// ─── Cache helpers ─────────────────────────────────────────────────────────────

/** Persist the active sessions list to local cache. */
export async function cacheActiveSessions(sessions: Session[]): Promise<void> {
  await db.sessions.bulkPut(sessions)
}

/** Persist the product catalog to local cache. */
export async function cacheProducts(products: Product[]): Promise<void> {
  await db.products.bulkPut(products)
}

/** Read cached active sessions for a cafe. */
export async function getCachedActiveSessions(cafeId: string): Promise<Session[]> {
  return db.sessions
    .where('cafe_id').equals(cafeId)
    .and(s => s.status === 'active')
    .toArray()
}

/** Read cached products for a cafe. */
export async function getCachedProducts(cafeId: string): Promise<Product[]> {
  return db.products
    .where('cafe_id').equals(cafeId)
    .toArray()
}

/** Remove a session from the local cache (e.g. after it's closed). */
export async function evictSession(sessionId: string): Promise<void> {
  await db.sessions.delete(sessionId)
}
