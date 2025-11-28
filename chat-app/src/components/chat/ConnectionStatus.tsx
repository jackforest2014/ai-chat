'use client'

import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConnectionStatus as Status } from '@/types/websocket'

interface ConnectionStatusProps {
  status: Status
  error?: string | null
  className?: string
}

export function ConnectionStatus({ status, error, className }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Connected',
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          dotColor: 'bg-green-500',
        }
      case 'connecting':
        return {
          icon: Loader2,
          text: 'Connecting...',
          color: 'text-blue-500',
          bgColor: 'bg-blue-100',
          dotColor: 'bg-blue-500',
          animate: true,
        }
      case 'reconnecting':
        return {
          icon: Loader2,
          text: 'Reconnecting...',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100',
          dotColor: 'bg-yellow-500',
          animate: true,
        }
      case 'failed':
        return {
          icon: AlertCircle,
          text: 'Connection Failed',
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          dotColor: 'bg-red-500',
        }
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          text: 'Disconnected',
          color: 'text-slate-500',
          bgColor: 'bg-slate-100',
          dotColor: 'bg-slate-500',
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex items-center gap-2">
        {/* Status dot */}
        <div className="relative">
          <div className={cn('w-2 h-2 rounded-full', config.dotColor)} />
          {status === 'connected' && (
            <div className={cn('absolute inset-0 w-2 h-2 rounded-full animate-ping', config.dotColor)} />
          )}
        </div>

        {/* Icon */}
        <Icon
          className={cn(
            'w-4 h-4',
            config.color,
            config.animate && 'animate-spin'
          )}
        />

        {/* Status text */}
        <span className={cn('text-sm font-medium', config.color)}>
          {config.text}
        </span>
      </div>

      {/* Error message */}
      {error && (
        <span className="text-xs text-red-600 max-w-xs truncate" title={error}>
          ({error})
        </span>
      )}
    </div>
  )
}
