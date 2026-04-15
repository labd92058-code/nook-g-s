import { motion, AnimatePresence } from 'motion/react'
import { Button } from './Button'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger'
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'primary',
}: ConfirmDialogProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />
          <div className="fixed inset-0 flex items-center justify-center z-[210] p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-[320px] shadow-2xl pointer-events-auto"
            >
              <h3 className="text-lg font-bold text-text mb-2">{title}</h3>
              <p className="text-sm text-text2 mb-6 leading-relaxed">{message}</p>
              <div className="flex flex-col gap-2">
                <Button
                  variant={variant}
                  onClick={() => {
                    onConfirm()
                    onClose()
                  }}
                  className="w-full"
                >
                  {confirmLabel}
                </Button>
                <Button variant="ghost" onClick={onClose} className="w-full">
                  {cancelLabel}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
