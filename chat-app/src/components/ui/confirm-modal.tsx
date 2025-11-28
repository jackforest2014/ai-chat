'use client'

import * as React from 'react'
import { X, AlertTriangle, Info, AlertCircle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export type ConfirmModalVariant = 'danger' | 'warning' | 'info' | 'default'

export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string | React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: ConfirmModalVariant
  isLoading?: boolean
}

const variantConfig: Record<ConfirmModalVariant, {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  confirmButtonVariant: 'default' | 'destructive' | 'outline' | 'secondary'
}> = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmButtonVariant: 'destructive',
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmButtonVariant: 'default',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmButtonVariant: 'default',
  },
  default: {
    icon: HelpCircle,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    confirmButtonVariant: 'default',
  },
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmModalProps) {
  const [isConfirming, setIsConfirming] = React.useState(false)
  const config = variantConfig[variant]
  const Icon = config.icon

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading && !isConfirming) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, isLoading, isConfirming])

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleConfirm = async () => {
    try {
      setIsConfirming(true)
      await onConfirm()
    } finally {
      setIsConfirming(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading && !isConfirming) {
      onClose()
    }
  }

  if (!isOpen) return null

  const loading = isLoading || isConfirming

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-md bg-white rounded-2xl shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className={cn(
            'absolute top-4 right-4 p-1 rounded-lg text-gray-400',
            'hover:text-gray-600 hover:bg-gray-100 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={cn('p-3 rounded-full', config.iconBg)}>
              <Icon className={cn('w-8 h-8', config.iconColor)} />
            </div>
          </div>

          {/* Title */}
          <h2
            id="confirm-modal-title"
            className="text-xl font-semibold text-gray-900 text-center mb-2"
          >
            {title}
          </h2>

          {/* Message */}
          <div
            id="confirm-modal-description"
            className="text-gray-600 text-center mb-6"
          >
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              {cancelText}
            </Button>
            <Button
              variant={config.confirmButtonVariant}
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for easier usage
export interface UseConfirmModalOptions {
  title: string
  message: string | React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: ConfirmModalVariant
}

export function useConfirmModal() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [options, setOptions] = React.useState<UseConfirmModalOptions>({
    title: '',
    message: '',
  })
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null)

  const confirm = React.useCallback((opts: UseConfirmModalOptions): Promise<boolean> => {
    setOptions(opts)
    setIsOpen(true)

    return new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleClose = React.useCallback(() => {
    setIsOpen(false)
    resolveRef.current?.(false)
    resolveRef.current = null
  }, [])

  const handleConfirm = React.useCallback(() => {
    setIsOpen(false)
    resolveRef.current?.(true)
    resolveRef.current = null
  }, [])

  const ConfirmModalComponent = React.useCallback(() => (
    <ConfirmModal
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      {...options}
    />
  ), [isOpen, handleClose, handleConfirm, isLoading, options])

  return {
    confirm,
    setIsLoading,
    ConfirmModal: ConfirmModalComponent,
  }
}
