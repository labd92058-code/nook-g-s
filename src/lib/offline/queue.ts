/**
 * Outbox queue for offline writes.
 * Every write made while offline is pushed here and replayed when online.
 */
import { db, OutboxEntry, OutboxActionType } from './db'

const MAX_RETRIES = 3

/** Add an action to the outbox. */
export async function enqueue(
  actionType: OutboxActionType,
  payload: Record<string, unknown>
): Promise<number> {
  return db.outbox.add({
    actionType,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
    failed: false,
  })
}

/** Get all pending (non-failed) entries in FIFO order. */
export async function getPendingEntries(): Promise<OutboxEntry[]> {
  // LOGIC FIX: Dexie stores booleans as booleans, not as 0/1 integers.
  // Using filter instead of where/equals to avoid IndexedDB boolean index mismatch.
  const all = await db.outbox.toArray()
  return all
    .filter(e => !e.failed)
    .sort((a, b) => a.createdAt - b.createdAt)
}

/** Get all permanently-failed entries. */
export async function getFailedEntries(): Promise<OutboxEntry[]> {
  const all = await db.outbox.toArray()
  return all.filter(e => e.failed)
}

/** Mark an entry as processed — remove it from the queue. */
export async function dequeue(id: number): Promise<void> {
  await db.outbox.delete(id)
}

/** Increment the retry count; mark as failed if max retries exceeded. */
export async function recordRetryFailure(id: number): Promise<void> {
  const entry = await db.outbox.get(id)
  if (!entry) return

  const next = entry.retryCount + 1
  await db.outbox.update(id, {
    retryCount: next,
    failed: next >= MAX_RETRIES,
  })
}

/** How many items are waiting to sync. */
export async function getPendingCount(): Promise<number> {
  const all = await db.outbox.toArray()
  return all.filter(e => !e.failed).length
}
