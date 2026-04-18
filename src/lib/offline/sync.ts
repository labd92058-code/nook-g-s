/**
 * Sync runner — processes the outbox queue when connectivity is restored.
 * Processes entries in FIFO order; retries up to MAX_RETRIES per entry.
 */
import { getPendingEntries, dequeue, recordRetryFailure } from './queue'
import { evictSession } from './db'
import { startSession, endSession, cancelSession, addExtrasToSession, getSession } from '../services/sessions'
import { addSessionConsumption } from '../services/products'

export interface SyncResult {
  processed: number
  failed: number
  errors: string[]
}

/** Run the full outbox sync. Returns a summary. */
export async function runSync(): Promise<SyncResult> {
  const entries = await getPendingEntries()
  const result: SyncResult = { processed: 0, failed: 0, errors: [] }

  for (const entry of entries) {
    try {
      await processEntry(entry)
      if (entry.id != null) await dequeue(entry.id)
      result.processed++
    } catch (err: any) {
      result.failed++
      result.errors.push(`[${entry.actionType}] ${err?.message ?? 'Unknown error'}`)
      if (entry.id != null) await recordRetryFailure(entry.id)
    }
  }

  return result
}

/** Dispatch a single outbox entry to the appropriate service function. */
async function processEntry(entry: { actionType: string; payload: Record<string, unknown> }): Promise<void> {
  switch (entry.actionType) {
    case 'start_session': {
      const p = entry.payload as any
      await startSession(p)
      break
    }
    case 'end_session': {
      const p = entry.payload as any
      await endSession(p)
      await evictSession(p.sessionId)
      break
    }
    case 'cancel_session': {
      const p = entry.payload as any
      await cancelSession(p.sessionId)
      await evictSession(p.sessionId)
      break
    }
    case 'add_extras': {
      const p = entry.payload as any
      const session = await getSession(p.sessionId)
      await addExtrasToSession(session, p.extras)
      break
    }
    case 'add_consumption': {
      const p = entry.payload as any
      await addSessionConsumption(
        p.sessionId,
        p.productId,
        p.productName,
        p.quantity,
        p.unitPrice
      )
      break
    }
    default:
      throw new Error(`Unknown action type: ${entry.actionType}`)
  }
}
