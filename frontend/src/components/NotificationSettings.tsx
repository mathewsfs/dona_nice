import React from 'react'
import { useNotifications } from '../hooks/useNotifications'

interface NotificationSettingsProps {
  onSettingsChange?: (settings: NotificationSettings) => void
}

interface NotificationSettings {
  newOrders: boolean
  payments: boolean
  reminders: boolean
  sound: boolean
  desktop: boolean
}

export default function NotificationSettings({ onSettingsChange }: NotificationSettingsProps) {
  const { isSupported, permission, requestPermission } = useNotifications()
  const [settings, setSettings] = React.useState<NotificationSettings>({
    newOrders: true,
    payments: true,
    reminders: true,
    sound: true,
    desktop: true
  })

  const handlePermissionRequest = async () => {
    const granted = await requestPermission()
    if (granted) {
      // Show a test notification
      const { showNotification } = useNotifications()
      showNotification({
        title: '🎉 Notificações Ativadas!',
        body: 'Você receberá notificações da Dona Nice',
        tag: 'test-notification'
      })
    }
  }

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    onSettingsChange?.(newSettings)
  }

  if (!isSupported) {
    return (
      <div className="notification-settings">
        <h3>🔔 Notificações</h3>
        <p className="not-supported">
          Seu navegador não suporta notificações desktop.
        </p>
      </div>
    )
  }

  return (
    <div className="notification-settings">
      <h3>🔔 Notificações</h3>
      
      {permission === 'default' && (
        <div className="permission-request">
          <p>Ative as notificações para receber alertas importantes:</p>
          <button 
            onClick={handlePermissionRequest}
            className="btn btn-primary"
          >
            Ativar Notificações
          </button>
        </div>
      )}

      {permission === 'denied' && (
        <div className="permission-denied">
          <p>⚠️ Notificações bloqueadas. Habilite nas configurações do navegador.</p>
        </div>
      )}

      {permission === 'granted' && (
        <div className="settings-form">
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.newOrders}
                onChange={(e) => handleSettingChange('newOrders', e.target.checked)}
              />
              <span className="setting-name">🧁 Novos Pedidos</span>
              <span className="setting-description">Alertar quando novos pedidos forem criados</span>
            </label>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.payments}
                onChange={(e) => handleSettingChange('payments', e.target.checked)}
              />
              <span className="setting-name">💰 Pagamentos</span>
              <span className="setting-description">Notificar sobre pagamentos recebidos</span>
            </label>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.reminders}
                onChange={(e) => handleSettingChange('reminders', e.target.checked)}
              />
              <span className="setting-name">⏰ Lembretes</span>
              <span className="setting-description">Lembretes de pagamentos pendentes</span>
            </label>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.sound}
                onChange={(e) => handleSettingChange('sound', e.target.checked)}
              />
              <span className="setting-name">🔊 Som</span>
              <span className="setting-description">Reproduzir som nas notificações</span>
            </label>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.desktop}
                onChange={(e) => handleSettingChange('desktop', e.target.checked)}
              />
              <span className="setting-name">🖥️ Desktop</span>
              <span className="setting-description">Mostrar notificações na área de trabalho</span>
            </label>
          </div>

          <div className="test-notification">
            <button 
              onClick={() => {
                const { showNotification } = useNotifications()
                showNotification({
                  title: '🧪 Teste de Notificação',
                  body: 'Esta é uma notificação de teste da Dona Nice',
                  tag: 'test-notification'
                })
              }}
              className="btn btn-secondary btn-sm"
            >
              🧪 Testar Notificação
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
