import React from 'react'
import { Stats } from '../hooks/useAppState'

interface DashboardProps {
  stats: Stats
  selectedMonth: number
  selectedYear: number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  onViewChange: (view: any) => void
}

export default function Dashboard({ stats, selectedMonth, selectedYear, onMonthChange, onYearChange, onViewChange }: DashboardProps) {
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  
  return (
    <section className="card">
      <h2 data-icon="📊">Início</h2>
      
      {/* Date Filter - Mobile Optimized */}
      <div className="date-filter">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="month-filter">Mês:</label>
            <select
              id="month-filter"
              value={selectedMonth}
              onChange={(e) => onMonthChange(parseInt(e.target.value))}
              className="form-select"
            >
              {monthNames.map((name, index) => (
                <option key={index + 1} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="year-filter">Ano:</label>
            <select
              id="year-filter"
              value={selectedYear}
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              className="form-select"
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Stats Grid - Mobile Responsive */}
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-number">{stats.orders}</span>
          <span className="stat-label">Pedidos</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.paidOrders}</span>
          <span className="stat-label">Pagos</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.pendingOrders}</span>
          <span className="stat-label">Pendentes</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">R$ {stats.earnings.toFixed(0)}</span>
          <span className="stat-label">Faturamento</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">R$ {stats.pendingEarnings.toFixed(0)}</span>
          <span className="stat-label">Pendente</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.orders > 0 ? Math.round((stats.paidOrders / stats.orders) * 100) : 0}%</span>
          <span className="stat-label">Taxa</span>
        </div>
      </div>
      
      {/* Quick Actions - Mobile First */}
      <div className="quick-actions">
        <button onClick={() => onViewChange('pedidos')} className="btn btn-secondary">
          📋 Pedidos
        </button>
        <button onClick={() => onViewChange('cobrancas')} className="btn btn-secondary">
          💰 Cobranças
        </button>
        <button onClick={() => onViewChange('produtos')} className="btn btn-secondary">
          🍰 Produtos
        </button>
      </div>
    </section>
  )
}
