import React from 'react'
import { View } from '../hooks/useAppState'

interface SidebarProps {
  currentView: View
  onViewChange: (view: View) => void
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ currentView, onViewChange, isOpen, onClose }: SidebarProps) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h1>Dona Nice</h1>
      </div>
      <nav className="sidebar-nav">
        {[View.Home, View.Orders, View.Billing, View.Products, View.Settings].map((v) => {
          const labels = {
            [View.Home]: { text: 'Início', emoji: '🏠' },
            [View.Orders]: { text: 'Pedidos', emoji: '📋' },
            [View.Billing]: { text: 'Cobranças', emoji: '💰' },
            [View.Products]: { text: 'Produtos', emoji: '🍰' },
            [View.Settings]: { text: 'Configurações', emoji: '⚙️' }
          }
          return (
            <button
              key={v}
              className={currentView === v ? 'active' : ''}
              onClick={() => {
                onViewChange(v)
                onClose()
              }}
              data-emoji={labels[v].emoji}
            >
              {labels[v].text}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
