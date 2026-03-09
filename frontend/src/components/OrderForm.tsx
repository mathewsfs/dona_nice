import React, { useState, useEffect } from 'react'
import { Product, Order } from '../hooks/useAppState'

interface OrderItem {
  productId: string
  name: string
  price: number
  quantity: number
}

interface OrderFormProps {
  products: Product[]
  editingOrder?: Partial<Order> | null
  onCreateOrder: (orderData: {
    customerName: string
    customerPhone: string | undefined
    items: { name: string; quantity: number; price: number }[]
    discount: number
    paymentDueDate?: string
    total: number
  }) => void
  onUpdateOrder?: (orderId: string, orderData: {
    customerName: string
    customerPhone: string | undefined
    items: { name: string; quantity: number; price: number }[]
    discount: number
    paymentDueDate?: string
    total: number
  }) => void
  onCancelEdit?: () => void
}

export default function OrderForm({ 
  products, 
  editingOrder, 
  onCreateOrder, 
  onUpdateOrder, 
  onCancelEdit 
}: OrderFormProps) {
  const [showForm, setShowForm] = useState(!!editingOrder)
  const [customerName, setCustomerName] = useState(editingOrder?.customerName || '')
  const [customerPhone, setCustomerPhone] = useState<string | undefined>(editingOrder?.customerPhone)
  const [orderTotal, setOrderTotal] = useState(editingOrder?.total || 0)
  const [orderDiscount, setOrderDiscount] = useState(editingOrder?.discount || 0)
  const [orderItems, setOrderItems] = useState<OrderItem[]>(
    editingOrder?.items?.map(item => ({
      productId: '', // Será preenchido quando encontrar o produto
      name: item.name,
      price: item.price,
      quantity: item.quantity
    })) || []
  )
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [paymentDueDate, setPaymentDueDate] = useState(editingOrder?.paymentDueDate || '')

  const resetForm = () => {
    setCustomerName(editingOrder?.customerName || '')
    setCustomerPhone(editingOrder?.customerPhone)
    setOrderItems(
      editingOrder?.items?.map(item => ({
        productId: '',
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })) || []
    )
    setSelectedProductId('')
    setSelectedQuantity(1)
    setOrderDiscount(editingOrder?.discount || 0)
    setPaymentDueDate(editingOrder?.paymentDueDate || '')
    setShowForm(false)
    if (onCancelEdit) {
      onCancelEdit()
    }
  }

  useEffect(() => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const discount = Math.max(0, Number.isFinite(orderDiscount) ? orderDiscount : 0)
    const total = Math.max(0, subtotal - discount)
    setOrderTotal(total)
  }, [orderItems, orderDiscount])

  const handleCreateOrder = () => {
    if (!customerName.trim()) {
      alert('Preencha o nome do cliente')
      return
    }

    if (orderItems.length === 0) {
      alert('Selecione ao menos 1 produto para montar o pedido')
      return
    }
    
    const phone = customerPhone ? customerPhone.replace(/\D/g, '') : '' // Remove caracteres não numéricos
    const orderData = {
      customerName: customerName.trim(),
      customerPhone: phone,
      items: orderItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      discount: orderDiscount,
      paymentDueDate: paymentDueDate || undefined,
      total: orderTotal
    }

    if (editingOrder && onUpdateOrder) {
      // Modo de edição
      onUpdateOrder(editingOrder.id, orderData)
    } else if (onCreateOrder) {
      // Modo de criação
      onCreateOrder(orderData)
    }

    // Resetar formulário após criar/editar
    resetForm()
  }

  const addProductToOrder = () => {
    const product = products.find((p) => p.id === selectedProductId)
    if (!product) {
      alert('Selecione um produto')
      return
    }
    const qty = Math.max(1, selectedQuantity || 1)

    setOrderItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === product.id)
      if (existingIdx >= 0) {
        const next = [...prev]
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + qty,
        }
        return next
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: qty }]
    })

    setSelectedProductId('')
    setSelectedQuantity(1)
  }

  return (
    <div className="order-form">
      {!showForm ? (
        <div style={{ textAlign: 'center', padding: '10px 20px' }}>
          <h3>📋 Pedidos</h3>
          <p style={{ marginBottom: '30px', color: 'var(--text-secondary)' }}>
            {editingOrder ? 'Clique abaixo para editar o pedido' : 'Clique abaixo para adicionar um novo pedido'}
          </p>
          <button 
            onClick={() => setShowForm(true)} 
            className="btn btn-primary"
            style={{ padding: '15px 30px', fontSize: '16px' }}
          >
            {editingOrder ? '✏️ Editar Pedido' : '➕ Adicionar Pedido'}
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <button 
              onClick={resetForm} 
              className="btn btn-secondary"
              style={{ marginRight: '10px' }}
            >
              ❌ Cancelar
            </button>
            <h3 style={{ display: 'inline', margin: '0 20px' }}>
              {editingOrder ? '✏️ Editando Pedido' : '➕ Novo Pedido'}
            </h3>
          </div>
          <div className="form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="customer-name">Cliente:</label>
                <input
                  id="customer-name"
                  type="text"
                  placeholder="Nome do cliente"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="form-input"
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label htmlFor="customer-phone">WhatsApp:</label>
                <input
                  id="customer-phone"
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={customerPhone || ''}
                  onChange={(e) => setCustomerPhone(e.target.value || undefined)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="order-product">Produto:</label>
                <select
                  id="order-product"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="form-input"
                >
                  <option value="">Selecione...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — R$ {p.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="order-qty">Qtd:</label>
                <input
                  id="order-qty"
                  type="number"
                  min={1}
                  step={1}
                  value={selectedQuantity}
                  onChange={(e) => setSelectedQuantity(Math.max(1, parseInt(e.target.value || '1', 10) || 1))}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{justifyContent: 'flex-end'}}>
                <button 
                  onClick={addProductToOrder} 
                  className="btn btn-primary"
                  disabled={!selectedProductId}
                >
                  ➕ Adicionar
                </button>
              </div>
            </div>

            {orderItems.length > 0 && (
              <div className="order-items">
                <h4>🛒 Itens do Pedido:</h4>
                {orderItems.map((item, index) => (
                  <div key={index} className="order-item">
                    <span className="item-name">{item.name}</span>
                    <span className="item-quantity">x{item.quantity}</span>
                    <span className="item-price">R$ {(item.price * item.quantity).toFixed(2)}</span>
                    <button 
                      onClick={() => {
                        setOrderItems(orderItems.filter((_, i) => i !== index))
                      }}
                      className="btn btn-danger btn-sm"
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="order-discount">Desconto:</label>
                <input
                  id="order-discount"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0,00"
                  value={orderDiscount || ''}
                  onChange={(e) => setOrderDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="payment-due-date">Previsão de Pagamento:</label>
                <input
                  id="payment-due-date"
                  type="datetime-local"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="order-total">Total:</label>
                <input
                  id="order-total"
                  type="number"
                  step="0.01"
                  value={orderTotal}
                  readOnly
                  className="form-input"
                  style={{ backgroundColor: 'var(--bg-secondary)', fontWeight: 'bold' }}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group" style={{justifyContent: 'flex-end'}}>
                <button 
                  onClick={handleCreateOrder} 
                  className="btn btn-success"
                  disabled={!customerName.trim() || orderItems.length === 0}
                >
                  {editingOrder ? '💾 Atualizar Pedido' : '✅ Criar Pedido'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
