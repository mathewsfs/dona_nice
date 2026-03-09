import React, { useState, useEffect } from 'react'
import { useAppState, View, Order, Product } from './hooks/useAppState'
import { ToastProvider, useToast } from './components/Toast'
import { useNotifications } from './hooks/useNotifications'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import OrderForm from './components/OrderForm'
import OrderList from './components/OrderList'
import NotificationSettings from './components/NotificationSettings'

// Modal states
type ModalType = 'edit-product' | null

function AppContent() {
  const {
    isAuthenticated,
    loading,
    view,
    orders,
    products,
    stats,
    selectedMonth,
    selectedYear,
    settings,
    orderLoading,
    setView,
    setSelectedMonth,
    setSelectedYear,
    setOrders,
    setProducts,
    setSettings,
    handleLogin,
    handleLogout,
    authenticatedFetch
  } = useAppState()

  const { addToast } = useToast()
  const { showOrderNotification, showPaymentNotification, showReminderNotification } = useNotifications()
  
  // Product form states
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState(0)
  const [showProductForm, setShowProductForm] = useState(false)
  
  // Settings form states
  const [theme, setTheme] = useState('light')
  const [webhook, setWebhook] = useState('')
  const [template, setTemplate] = useState('')
  const [templateEditing, setTemplateEditing] = useState(false)
  const [tempTemplate, setTempTemplate] = useState('')
  
  // Modal states
  const [modalOpen, setModalOpen] = useState<ModalType>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState(0)
  
  // Webhook editing states
  const [webhookEditing, setWebhookEditing] = useState(false)
  const [tempWebhook, setTempWebhook] = useState('')
  
  // Mobile menu state
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Helper functions
  const sanitizeWebhook = (url: string) => {
    return url.trim()
  }

  const decodeHtmlEntities = (text: string) => {
    return text.replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#x27;/g, "'")
  }

  const changeSetting = async (newSettings: Partial<typeof settings>) => {
    try {
      const response = await authenticatedFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, ...newSettings })
      })
      
      if (response.ok) {
        const updatedSettings = await response.json()
        setSettings(updatedSettings)
        addToast({
          message: 'Configurações salvas com sucesso!',
          type: 'success'
        })
      }
    } catch (error) {
      addToast({
        message: 'Erro ao salvar configurações',
        type: 'error'
      })
    }
  }

  const sendWhatsAppNotification = async ({ type, order, customerName, customerPhone }: {
    type: 'order_created' | 'order_paid' | 'payment_due' | 'manual_billing'
    order: Order
    customerName: string
    customerPhone: string
  }) => {
    if (!settings.whatsapp_webhook) return

    const templates = {
      order_created: settings.wa_order_created_template,
      order_paid: settings.wa_order_paid_template,
      payment_due: settings.wa_payment_due_template,
      manual_billing: settings.wa_manual_billing_template
    }

    const template = templates[type] || ''
    const ordersText = order.items?.map(item => 
      `🔸 ${item.name} x${item.quantity} - R$ ${item.price.toFixed(2)}`
    ).join('\n') || `Pedido #${order.id}`

    const message = template
      .replace(/{name}/g, customerName)
      .replace(/{orders}/g, ordersText)
      .replace(/{total}/g, order.total.toFixed(2))
      .replace(/{orderId}/g, order.id)
      .replace(/{paymentDueDate}/g, order.paymentDueDate || '')

    try {
      await fetch(settings.whatsapp_webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: customerPhone,
          message,
          customerName,
          orderId: order.id,
          total: order.total,
          notificationType: type
        })
      })
      
      addToast({
        message: 'Notificação enviada com sucesso!',
        type: 'success'
      })
    } catch (error) {
      addToast({
        message: 'Erro ao enviar notificação',
        type: 'error'
      })
    }
  }

  const startEditingWebhook = () => {
    setTempWebhook(webhook)
    setWebhookEditing(true)
  }

  const cancelEditingWebhook = () => {
    setTempWebhook('')
    setWebhookEditing(false)
  }

  const saveWebhook = () => {
    const cleanValue = sanitizeWebhook(tempWebhook)
    setWebhook(cleanValue)
    changeSetting({ whatsapp_webhook: cleanValue })
    setWebhookEditing(false)
    addToast({
      message: 'Webhook salvo com sucesso!',
      type: 'success'
    })
  }

  const clearWebhook = () => {
    if (window.confirm('Tem certeza que deseja limpar o webhook? Isso desativará todos os disparos automáticos.')) {
      setWebhook('')
      changeSetting({ whatsapp_webhook: '' })
      setTempWebhook('')
      setWebhookEditing(false)
      addToast({
        message: 'Webhook limpo com sucesso!',
        type: 'success'
      })
    }
  }

  const startEditingTemplate = () => {
    setTempTemplate(template)
    setTemplateEditing(true)
  }

  const cancelEditingTemplate = () => {
    setTempTemplate('')
    setTemplateEditing(false)
  }

  const saveTemplate = () => {
    setTemplate(tempTemplate)
    changeSetting({ wa_template: tempTemplate })
    setTemplateEditing(false)
    addToast({
      message: 'Mensagem padrão salva com sucesso!',
      type: 'success'
    })
  }

  useEffect(() => {
    setTheme(settings.theme || 'light')
    const webhookValue = sanitizeWebhook(decodeHtmlEntities(settings.whatsapp_webhook || ''))
    setWebhook(webhookValue)
    setTemplate(settings.wa_template || 
      "Olá {name}! 😊\n\nVimos que você tem pedidos pendentes aqui na Dona Nice 🧁\n\n📋 *Resumo dos Pedidos:*\n{orders}\n\n💰 *Total a Pagar:* R$ {total}\n\nPor favor, nos avise quando puder realizar o pagamento. Aceitamos PIX, dinheiro ou cartão na entrega!\n\n📞 *Contato:* (81) 98299-0999\n🧁 *Dona Nice - Doces Caseiros*\n\nObrigado pela preferência! ❤️")
  }, [settings])
  
  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
  }, [theme])

  const openWhatsApp = (customerName?: string, customerPhone?: string) => {
    const pendingOrders = orders.filter((o) => !o.paid)
    
    const ordersToSend = customerName 
      ? pendingOrders.filter(o => o.customerName === customerName)
      : pendingOrders
    
    if (ordersToSend.length === 0) {
      addToast({
        message: customerName ? 'Nenhuma pendência para este cliente.' : 'Nenhuma pendência.',
        type: 'info'
      })
      return
    }
    
    const ordersByCustomer = ordersToSend.reduce((acc, order) => {
      const name = order.customerName
      if (!acc[name]) {
        acc[name] = {
          phone: order.customerPhone || '',
          orders: [],
          total: 0
        }
      }
      acc[name].orders.push(order)
      acc[name].total += order.total
      return acc
    }, {} as Record<string, { phone: string; orders: Order[]; total: number }>)
    
    Object.entries(ordersByCustomer).forEach(([name, data]) => {
      if (settings.whatsapp_webhook && data.phone) {
        data.orders.forEach(order => {
          sendWhatsAppNotification({
            type: 'manual_billing',
            order: order,
            customerName: name,
            customerPhone: data.phone
          })
        })
      } else {
        const ordersList = data.orders.map(order => {
          let orderDetails = `🔸 *Pedido ${order.id}*\n`
          
          if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
              orderDetails += `  • ${item.name} x${item.quantity} - R$ ${item.price.toFixed(2)}\n`
            })
          } else {
            orderDetails += `  • Valor total: R$ ${order.total.toFixed(2)}\n`
          }
          
          return orderDetails
        }).join('\n')
        
        const message = template
          .replace(/{name}/g, name)
          .replace(/{orders}/g, ordersList)
          .replace(/{total}/g, data.total.toFixed(2))
        
        const phone = data.phone.replace(/\D/g, '')
        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank')
      }
    })
  }

  const createProduct = async () => {
    if (!productName || productPrice <= 0) {
      addToast({
        message: 'Preencha nome e preço do produto',
        type: 'error'
      })
      return
    }

    try {
      const response = await authenticatedFetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: productName, price: productPrice })
      })

      if (response.ok) {
        const newProduct = await response.json()
        setProducts([...products, newProduct])
        setProductName('')
        setProductPrice(0)
        setShowProductForm(false)
        addToast({
          message: 'Produto criado com sucesso!',
          type: 'success'
        })
      }
    } catch (error) {
      addToast({
        message: 'Erro ao criar produto',
        type: 'error'
      })
    }
  }

  const deleteProduct = async (productId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return

    try {
      const response = await authenticatedFetch(`/api/products/${productId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setProducts(products.filter(p => p.id !== productId))
        addToast({
          message: 'Produto excluído com sucesso!',
          type: 'success'
        })
      }
    } catch (error) {
      addToast({
        message: 'Erro ao excluir produto',
        type: 'error'
      })
    }
  }

  const startEditingProduct = (product: Product) => {
    setEditingProduct(product)
    setEditName(product.name)
    setEditPrice(product.price)
    setModalOpen('edit-product')
  }

  const saveEditedProduct = async () => {
    if (!editingProduct || !editName || editPrice <= 0) return

    try {
      const response = await authenticatedFetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, price: editPrice })
      })

      if (response.ok) {
        const updatedProduct = await response.json()
        setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct : p))
        setModalOpen(null)
        setEditingProduct(null)
        setEditName('')
        setEditPrice(0)
        addToast({
          message: 'Produto atualizado com sucesso!',
          type: 'success'
        })
      }
    } catch (error) {
      addToast({
        message: 'Erro ao atualizar produto',
        type: 'error'
      })
    }
  }

  const togglePaid = async (order: Order) => {
    try {
      const response = await authenticatedFetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paid: !order.paid,
          paidAt: !order.paid ? new Date().toISOString() : undefined
        })
      })

      if (response.ok) {
        const updatedOrder = await response.json()
        setOrders(orders.map(o => o.id === order.id ? updatedOrder : o))
        
        if (!order.paid && updatedOrder.paid) {
          sendWhatsAppNotification({
            type: 'order_paid',
            order: updatedOrder,
            customerName: order.customerName,
            customerPhone: order.customerPhone || ''
          })
        }
        
        addToast({
          message: order.paid ? 'Pedido marcado como pendente' : 'Pedido marcado como pago',
          type: 'success'
        })
      }
    } catch (error) {
      addToast({
        message: 'Erro ao atualizar pedido',
        type: 'error'
      })
    }
  }

  const deleteOrder = async (order: Order) => {
    if (!window.confirm('Tem certeza que deseja excluir este pedido?')) return

    try {
      const response = await authenticatedFetch(`/api/orders/${order.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setOrders(orders.filter(o => o.id !== order.id))
        addToast({
          message: 'Pedido excluído com sucesso!',
          type: 'success'
        })
      }
    } catch (error) {
      addToast({
        message: 'Erro ao excluir pedido',
        type: 'error'
      })
    }
  }

  const exportCSV = () => {
    const headers = ['ID', 'Cliente', 'Telefone', 'Total', 'Desconto', 'Status', 'Data', 'Pago em']
    const rows = orders.map(order => [
      order.id,
      order.customerName,
      order.customerPhone || '',
      order.total.toFixed(2),
      order.discount?.toFixed(2) || '0',
      order.paid ? 'Pago' : 'Pendente',
      new Date(order.date || '').toLocaleDateString('pt-BR'),
      order.paidAt ? new Date(order.paidAt).toLocaleDateString('pt-BR') : ''
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `pedidos_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const createOrder = async (orderData: {
    customerName: string
    customerPhone: string | undefined
    items: { name: string; quantity: number; price: number }[]
    discount: number
    paymentDueDate?: string
    total: number
  }) => {
    try {
      const response = await authenticatedFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (response.ok) {
        const newOrder = await response.json()
        setOrders([newOrder, ...orders])
        
        sendWhatsAppNotification({
          type: 'order_created',
          order: newOrder,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone || ''
        })
        
        addToast({
          message: 'Pedido criado com sucesso!',
          type: 'success'
        })
      }
    } catch (error) {
      addToast({
        message: 'Erro ao criar pedido',
        type: 'error'
      })
    }
  }

  const updateOrder = async (orderId: string, orderData: {
    customerName: string
    customerPhone: string | undefined
    items: { name: string; quantity: number; price: number }[]
    discount: number
    paymentDueDate?: string
    total: number
  }) => {
    try {
      const response = await authenticatedFetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (response.ok) {
        const updatedOrder = await response.json()
        setOrders(orders.map(o => o.id === orderId ? updatedOrder : o))
        addToast({
          message: 'Pedido atualizado com sucesso!',
          type: 'success'
        })
      }
    } catch (error) {
      addToast({
        message: 'Erro ao atualizar pedido',
        type: 'error'
      })
    }
  }

  if (loading) {
    return <div className="loading">Carregando...</div>
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app">
      <Sidebar 
        currentView={view}
        onViewChange={setView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <main className="main-content">
        {view === View.Home && (
          <Dashboard
            stats={stats}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onViewChange={setView}
          />
        )}
        
        {view === View.Orders && (
          <OrderForm
            products={products}
            onCreateOrder={createOrder}
            onUpdateOrder={updateOrder}
          />
        )}
        
        {view === View.Billing && (
          <OrderList
            orders={orders}
            products={products}
            loading={orderLoading}
            onTogglePaid={togglePaid}
            onDeleteOrder={deleteOrder}
            onEditOrder={() => {}}
            onUpdateOrder={updateOrder}
            onExportCSV={exportCSV}
            onOpenWhatsApp={openWhatsApp}
          />
        )}
        
        {view === View.Products && (
          <section className="card">
            <h2 data-icon="🍰">Produtos</h2>
            
            {!showProductForm ? (
              <div className="add-product-section">
                <button 
                  onClick={() => setShowProductForm(true)}
                  className="btn btn-primary add-product-btn"
                >
                  ➕ Adicionar Novo Produto
                </button>
              </div>
            ) : (
              <div className="product-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="product-name">Nome do Produto:</label>
                    <input
                      id="product-name"
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="Nome do produto"
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="product-price">Preço:</label>
                    <input
                      id="product-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={productPrice}
                      onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group" style={{alignSelf: 'flex-end'}}>
                    <button onClick={createProduct} className="btn btn-primary">
                      Adicionar Produto
                    </button>
                  </div>
                </div>
                <div className="form-actions">
                  <button 
                    onClick={() => {
                      setShowProductForm(false)
                      setProductName('')
                      setProductPrice(0)
                    }}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="products-list">
              {products.map((product) => (
                <div key={product.id} className="product-item">
                  <div className="product-info">
                    <span className="product-name">{product.name}</span>
                    <span className="product-price">R$ {product.price.toFixed(2)}</span>
                  </div>
                  <div className="product-actions">
                    <button 
                      onClick={() => startEditingProduct(product)}
                      className="btn btn-secondary btn-sm"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => deleteProduct(product.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {view === View.Settings && (
          <section className="card">
            <h2 data-icon="⚙️">Configurações</h2>
            
            <div className="settings-form">
              <div className="form-group">
                <label htmlFor="theme">Tema:</label>
                <select
                  id="theme"
                  value={theme}
                  onChange={(e) => {
                    const newTheme = e.target.value
                    setTheme(newTheme)
                    changeSetting({ theme: newTheme })
                  }}
                >
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                </select>
              </div>

              <div className="form-group">
                <label>Webhook do WhatsApp:</label>
                {webhookEditing ? (
                  <div className="webhook-edit">
                    <input
                      type="url"
                      value={tempWebhook}
                      onChange={(e) => setTempWebhook(e.target.value)}
                      placeholder="https://api.whatsapp.com/..."
                      className="form-input"
                    />
                    <div className="webhook-actions">
                      <button onClick={saveWebhook} className="btn btn-primary btn-sm">
                        Salvar
                      </button>
                      <button onClick={cancelEditingWebhook} className="btn btn-secondary btn-sm">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="webhook-display">
                    <div className="webhook-url">
                      {webhook || 'Nenhum webhook configurado'}
                    </div>
                    <div className="webhook-actions">
                      <button onClick={startEditingWebhook} className="btn btn-secondary btn-sm">
                        {webhook ? 'Editar' : 'Configurar'}
                      </button>
                      {webhook && (
                        <button onClick={clearWebhook} className="btn btn-danger btn-sm">
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Mensagem Padrão WhatsApp:</label>
                {templateEditing ? (
                  <div className="template-edit">
                    <textarea
                      value={tempTemplate}
                      onChange={(e) => setTempTemplate(e.target.value)}
                      placeholder="Digite a mensagem padrão para WhatsApp..."
                      className="form-textarea"
                      rows={8}
                    />
                    <div className="template-actions">
                      <button onClick={saveTemplate} className="btn btn-primary btn-sm">
                        Salvar
                      </button>
                      <button onClick={cancelEditingTemplate} className="btn btn-secondary btn-sm">
                        Cancelar
                      </button>
                    </div>
                    <div className="template-help">
                      <small>
                        <strong>Variáveis disponíveis:</strong><br/>
                        • {'{name}'} - Nome do cliente<br/>
                        • {'{orders}'} - Lista de pedidos<br/>
                        • {'{total}'} - Valor total a pagar
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className="template-display">
                    <div className="template-preview">
                      {template.substring(0, 100)}{template.length > 100 ? '...' : ''}
                    </div>
                    <div className="template-actions">
                      <button onClick={startEditingTemplate} className="btn btn-secondary btn-sm">
                        Editar Mensagem
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <NotificationSettings />

              <div className="form-group">
                <button onClick={handleLogout} className="btn btn-danger">
                  Sair do Sistema
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Mobile menu button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        Menu
      </button>

      {/* Edit Product Modal */}
      {modalOpen === 'edit-product' && editingProduct && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Editar Produto</h3>
              <button 
                onClick={() => setModalOpen(null)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="edit-name">Nome:</label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-price">Preço:</label>
                <input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrice}
                  onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={saveEditedProduct} className="btn btn-primary">
                Salvar
              </button>
              <button 
                onClick={() => setModalOpen(null)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App
