/**
 * CONFLICT RESOLVED: useAudit previously duplicated the audit insert logic from
 * lib/services/audit.ts. Now delegates to logAuditAction from the service layer.
 * This ensures all audit writes go through the same code path.
 */
import { logAuditAction } from '../lib/services/audit'
import { useAuthStore } from '../stores/authStore'

/** Hook that provides a logAction function pre-filled with the current user's context. */
export function useAudit() {
  const logAction = async (action: string, details: Record<string, unknown> = {}) => {
    const { cafe, type, staff } = useAuthStore.getState()
    if (!cafe) return

    await logAuditAction({
      cafeId: cafe.id,
      staffId: type === 'staff' ? (staff?.id ?? null) : null,
      isOwner: type === 'owner',
      action,
      details,
    })
  }

  return { logAction }
}
