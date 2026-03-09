import React, { useState } from 'react'
import { Order, Product } from '../hooks/useAppState'
import OrderForm from './OrderForm'

interface OrderListProps {
  orders: Order[]
  products: Product[]
  loading: boolean
  onTogglePaid: (order: Order) => void
  onDeleteOrder: (order: Order) => void
  onEditOrder: (order: Order) => void
  onUpdateOrder: (orderId: string, orderData: {
    customerName: string
    customerPhone: string
    items: { name: string; quantity: number; price: number }[]
    discount: number
    paymentDueDate?: string
    total: number
  }) => void
  onExportCSV: () => void
  onOpenWhatsApp?: (customerName?: string, customerPhone?: string) => void
}

export default function OrderList({ orders, products, loading, onTogglePaid, onDeleteOrder, onEditOrder, onUpdateOrder, onExportCSV, onOpenWhatsApp }: OrderListProps) {
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)

  if (loading) {
    return <div className="loading">Carregando pedidos...</div>
  }

  return (
    <>
      <div className="section-header">
        <h2 data-icon="📋">Meus Pedidos</h2>
        <button onClick={onExportCSV} className="btn btn-secondary" title="Exportar todos os pedidos para CSV">
          📥 Exportar CSV
        </button>
      </div>
      
      <ul className="orders">
        {orders.map((o) => (
          <li
            key={o.id}
            className={o.paid ? 'paid' : 'pending'}
          >
            {editingOrderId === o.id ? (
              <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>✏️ Editando Pedido</h4>
                  <button 
                    onClick={() => setEditingOrderId(null)} 
                    className="btn btn-secondary"
                    style={{ marginBottom: '10px' }}
                  >
                    ❌ Cancelar Edição
                  </button>
                </div>
                <OrderForm
                  products={products}
                  editingOrder={o}
                  onCreateOrder={() => {}}
                  onUpdateOrder={(orderId, orderData) => {
                    onUpdateOrder(orderId, {
                      ...orderData,
                      customerPhone: orderData.customerPhone || ''
                    })
                    setEditingOrderId(null)
                  }}
                  onCancelEdit={() => setEditingOrderId(null)}
                />
              </div>
            ) : (
              <div>
                <strong>{o.customerName}</strong>
                {o.customerPhone && (
                  <span className="customer-phone">📱 {o.customerPhone}</span>
                )}
                <span className={`status-badge ${o.paid ? 'paid' : 'pending'}`}>
                  {o.paid ? '✅ Pago' : '⏳ Pendente'}
                </span>
                <div className="order-dates">
                  <span className="order-date">
                    📅 Registrado: {o.date ? new Date(o.date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Data não informada'}
                  </span>
                  {o.paymentDueDate && !o.paid && (
                    <span className="payment-due-date">
                      ⏰ Previsão: {new Date(o.paymentDueDate).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                  {o.paid && o.paidAt && (
                    <span className="payment-date">
                      💳 Previsão de pagamento: {new Date(o.paidAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {editingOrderId !== o.id && (
              <div className="order-actions">
                <span className="order-total">R$ {o.total.toFixed(2)}</span>
                {onOpenWhatsApp && (
                  <button 
                    onClick={() => onOpenWhatsApp(o.customerName, o.customerPhone)} 
                    className="btn btn-sm btn-success"
                    title="Enviar mensagem WhatsApp"
                  >
                    💬
                  </button>
                )}
                <button 
                  onClick={() => onEditOrder(o)} 
                  className="btn btn-sm btn-primary"
                  title="Editar pedido"
                  disabled={o.paid}
                >
                  ✏️
                </button>
                <button 
                  onClick={() => onTogglePaid(o)} 
                  className="btn btn-sm btn-secondary"
                  title={o.paid ? 'Marcar como não pago' : 'Marcar como pago'}
                >
                  {o.paid ? '↩️' : '✅'}
                </button>
                <button 
                  onClick={() => onDeleteOrder(o)} 
                  className="btn btn-sm btn-danger"
                  title="Excluir pedido"
                >
                  🗑️
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
