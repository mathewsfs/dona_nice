import { useState, useEffect } from 'react'

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if notifications are supported
    setIsSupported('Notification' in window)
    
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Notifications not supported')
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  const showNotification = (options: NotificationOptions): boolean => {
    if (!isSupported || permission !== 'granted') {
      console.warn('Notifications not permitted')
      return false
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false
      })

      // Auto-close after 5 seconds if not interactive
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close()
        }, 5000)
      }

      return true
    } catch (error) {
      console.error('Error showing notification:', error)
      return false
    }
  }

  const showOrderNotification = (customerName: string, total: number): boolean => {
    return showNotification({
      title: '🧁 Novo Pedido - Dona Nice',
      body: `${customerName} realizou um pedido no valor de R$ ${total.toFixed(2)}`,
      tag: 'new-order',
      requireInteraction: true
    })
  }

  const showPaymentNotification = (customerName: string, total: number): boolean => {
    return showNotification({
      title: '💰 Pagamento Recebido - Dona Nice',
      body: `${customerName} pagou R$ ${total.toFixed(2)}`,
      tag: 'payment-received'
    })
  }

  const showReminderNotification = (customerName: string, total: number): boolean => {
    return showNotification({
      title: '⏰ Lembrete de Pagamento - Dona Nice',
      body: `${customerName} tem pagamento pendente de R$ ${total.toFixed(2)}`,
      tag: 'payment-reminder',
      requireInteraction: true
    })
  }

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    showOrderNotification,
    showPaymentNotification,
    showReminderNotification
  }
}
