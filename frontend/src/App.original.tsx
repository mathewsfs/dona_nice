import React, { useState, useEffect } from 'react'
import { authService } from './services/auth'
import Login from './pages/Login'

// Types

type Order = {
  id: string
  customerName: string
  customerPhone?: string
  total: number
  discount?: number
  paid: boolean
  date?: string
  paidAt?: string
  items?: { name: string; quantity: number; price: number }[]
}

type Customer = { id: string; name: string; phone: string }

type Stats = {
  orders: number
  paidOrders: number
  pendingOrders: number
  earnings: number
  pendingEarnings: number
  month: number
  year: number
}

type Product = { id: string; name: string; price: number }

type Settings = { theme?: string; whatsapp_webhook?: string; wa_template?: string }

enum View {
  Home = 'inicio',
  Orders = 'pedidos',
  Billing = 'cobrancas',
  Products = 'produtos',
  Settings = 'configuracoes',
}

// Modal states
type ModalType = 'edit-product' | null

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>(View.Home)
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<Stats>({
    orders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    earnings: 0,
    pendingEarnings: 0,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  })
  
  // Date filter states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [settings, setSettings] = useState<Settings>({})
  const [orderLoading, setOrderLoading] = useState(false)
  
  // Order form states
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderTotal, setOrderTotal] = useState(0)
  const [orderDiscount, setOrderDiscount] = useState(0)
  const [orderItems, setOrderItems] = useState<{ productId: string; name: string; price: number; quantity: number }[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  
  // Product form states
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState(0)
  
  // Settings form states
  const [theme, setTheme] = useState('light')
  const [webhook, setWebhook] = useState('')
  
  // Modal states
  const [modalOpen, setModalOpen] = useState<ModalType>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState(0)
  
  // Mobile menu state
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      if (authService.isAuthenticated()) {
        setIsAuthenticated(true)
      }
      setLoading(false)
    }
    
    checkAuth()
  }, [])

  // Enhanced fetch with authentication
  const authenticatedFetch = async (url: string, options?: RequestInit) => {
    const headers = {
      ...options?.headers,
      ...authService.getAuthHeaders(),
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (response.status === 401 || response.status === 403) {
      authService.logout()
      setIsAuthenticated(false)
      throw new Error('Sessão expirada. Faça login novamente.')
    }

    return response
  }

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    authService.logout()
    setIsAuthenticated(false)
  }

  useEffect(() => {
    if (view === View.Orders) {
      setOrderLoading(true)
      authenticatedFetch('/api/orders')
        .then((r) => {
          return r.json()
        })
        .then((data) => {
          setOrders(data)
        })
        .catch((err) => {
          console.error('Erro ao carregar pedidos:', err)
          alert(`Erro ao carregar pedidos: ${err.message}`)
        })
        .finally(() => setOrderLoading(false))

      // Carregar produtos também para permitir selecionar itens no pedido
      authenticatedFetch('/api/products')
        .then((r) => r.json())
        .then(setProducts)
        .catch((err) => {
          console.error('Erro ao carregar produtos:', err)
        })
    }
    if (view === View.Billing) {
      setOrderLoading(true)
      authenticatedFetch('/api/orders')
        .then((r) => {
          return r.json()
        })
        .then((data) => {
          setOrders(data)
        })
        .catch((err) => {
          console.error('Erro ao carregar cobranças:', err)
          alert(`Erro ao carregar cobranças: ${err.message}`)
        })
        .finally(() => setOrderLoading(false))
    }
    if (view === View.Products) {
      authenticatedFetch('/api/products')
        .then((r) => {
          return r.json()
        })
        .then((data) => {
          setProducts(data)
        })
        .catch((err) => {
          console.error('Erro ao carregar produtos:', err)
          alert(`Erro ao carregar produtos: ${err.message}`)
        })
    }
    if (view === View.Home) {
      authenticatedFetch(`/api/stats?month=${selectedMonth}&year=${selectedYear}`)
        .then((r) => {
          return r.json()
        })
        .then(setStats)
        .catch((err) => {
          console.error('Erro ao carregar estatísticas:', err)
          // Fallback para valores zerados
          setStats({
            orders: 0,
            paidOrders: 0,
            pendingOrders: 0,
            earnings: 0,
            pendingEarnings: 0,
            month: selectedMonth,
            year: selectedYear
          })
        })
    }
  }, [view, selectedMonth, selectedYear])

  useEffect(() => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const discount = Math.max(0, Number.isFinite(orderDiscount) ? orderDiscount : 0)
    const total = Math.max(0, subtotal - discount)
    setOrderTotal(total)
  }, [orderItems, orderDiscount])

  useEffect(() => {
    authenticatedFetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setSettings(data)
        setTheme(data.theme || 'light')
        setWebhook(data.whatsapp_webhook || '')
      })
  }, [])
  
  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
  }, [theme])

  const openWhatsApp = (customerName?: string, customerPhone?: string) => {
    const pendingOrders = orders.filter((o) => !o.paid)
    
    // Se foi passado um cliente específico, filtrar apenas os pedidos dele
    const ordersToSend = customerName 
      ? pendingOrders.filter(o => o.customerName === customerName)
      : pendingOrders
    
    if (ordersToSend.length === 0) {
      alert(customerName ? 'Nenhuma pendência para este cliente.' : 'Nenhuma pendência.')
      return
    }
    
    // Agrupar pedidos por cliente
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
    
    // Enviar mensagem para cada cliente
    Object.entries(ordersByCustomer).forEach(([name, data]) => {
      const template = settings.wa_template || 
        "Olá {name}! 😊\n\nVimos que você tem pedidos pendentes aqui na Dona Nice 🧁\n\n📋 *Resumo dos Pedidos:*\n{orders}\n\n💰 *Total a Pagar:* R$ {total}\n\nPor favor, nos avise quando puder realizar o pagamento. Aceitamos PIX, dinheiro ou cartão na entrega!\n\n📞 *Contato:* (11) 98765-4321\n🍰 *Dona Nice - Doces Caseiros*\n\nObrigado pela preferência! ❤️"
      
      // Formatar lista de pedidos com detalhes dos produtos
      const ordersList = data.orders.map(order => {
        let orderDetails = `🔸 *Pedido ${order.id}*\n`
        
        // Adicionar itens do pedido se existirem
        if (order.items && order.items.length > 0) {
          orderDetails += order.items.map(item => 
            `  • ${item.name} (${item.quantity}x) = R$ ${(item.price * item.quantity).toFixed(2)}`
          ).join('\n')
        } else {
          orderDetails += `  • Valor total: R$ ${order.total.toFixed(2)}`
        }
        
        return orderDetails
      }).join('\n\n')
      
      // Substituir variáveis no template
      let message = template
        .replace(/{name}/g, name)
        .replace(/{orders}/g, ordersList)
        .replace(/{total}/g, data.total.toFixed(2))
      
      const text = encodeURIComponent(message)
      const phone = data.phone ? data.phone.replace(/\D/g, '') : ''
      
      if (phone) {
        // Enviar para número específico
        window.open(`https://wa.me/55${phone}?text=${text}`, '_blank')
      } else {
        // Enviar para número genérico se não tiver telefone
        window.open(`https://wa.me/?text=${text}`, '_blank')
      }
    })
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setEditName(product.name)
    setEditPrice(product.price)
    setModalOpen('edit-product')
  }
  
  const closeModal = () => {
    setModalOpen(null)
    setEditingProduct(null)
    setEditName('')
    setEditPrice(0)
  }
  
  const updateProduct = () => {
    if (!editingProduct || !editName.trim() || editPrice <= 0) {
      alert('Preencha nome e preço válidos')
      return
    }
    
    authenticatedFetch(`/api/products/${editingProduct.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: editName, price: editPrice }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((updatedProduct) => {
        setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct : p))
        closeModal()
        alert('Produto atualizado com sucesso!')
      })
      .catch((err) => {
        console.error('Erro ao atualizar produto:', err)
        alert(`Erro ao atualizar produto: ${err.message}`)
      })
  }

  const deleteProduct = (product: Product) => {
    if (!confirm(`Tem certeza que deseja excluir "${product.name}"?`)) {
      return
    }
    
    authenticatedFetch(`/api/products/${product.id}`, {
      method: 'DELETE',
    })
      .then(() => {
        setProducts(products.filter(p => p.id !== product.id))
        alert('Produto excluído com sucesso!')
      })
      .catch((err) => {
        console.error('Erro ao excluir produto:', err)
        alert(`Erro ao excluir produto: ${err.message}`)
      })
  }

  const toggleOrderPaid = (order: Order) => {
    authenticatedFetch(`/api/orders/${order.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paid: !order.paid }),
    })
      .then((response) => response.json())
      .then((updated) => {
        setOrders(orders.map(o => o.id === order.id ? updated : o))
        alert(`Pedido ${updated.paid ? 'marcado como pago' : 'marcado como não pago'}!`)
      })
      .catch((err) => {
        console.error('Erro ao atualizar pedido:', err)
        alert(`Erro ao atualizar pedido: ${err.message}`)
      })
  }

  const deleteOrder = (order: Order) => {
    if (!confirm(`Tem certeza que deseja excluir o pedido de ${order.customerName}?`)) {
      return
    }
    
    authenticatedFetch(`/api/orders/${order.id}`, {
      method: 'DELETE',
    })
      .then(() => {
        setOrders(orders.filter(o => o.id !== order.id))
        alert('Pedido excluído com sucesso!')
      })
      .catch((err) => {
        console.error('Erro ao excluir pedido:', err)
        alert(`Erro ao excluir pedido: ${err.message}`)
      })
  }
  
  const changeSetting = (data: Partial<Settings>) => {
    const updated = { ...settings, ...data }
    setSettings(updated)
    authenticatedFetch('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    })
  }

  const getThemeName = (themeValue: string) => {
    const themes = {
      'light': '☀️ Claro',
      'dark': '🌙 Escuro'
    }
    return themes[themeValue as keyof typeof themes] || themeValue
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  const renderSidebar = () => (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h1>🧁 Dona Nice</h1>
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
              className={view === v ? 'active' : ''}
              onClick={() => {
                setView(v)
                closeSidebar()
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

  const renderHome = () => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
    
    return (
      <section className="card">
        <h2 data-icon="📊">Visão Geral</h2>
        
        {/* Date Filter */}
        <div className="date-filter">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="month-filter">Mês:</label>
              <select
                id="month-filter"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
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
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
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
        
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">{stats.orders}</span>
            <span className="stat-label">Total de Pedidos</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.paidOrders}</span>
            <span className="stat-label">Pedidos Pagos</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.pendingOrders}</span>
            <span className="stat-label">Pedidos Pendentes</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">R$ {stats.earnings.toFixed(2)}</span>
            <span className="stat-label">Faturamento</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">R$ {stats.pendingEarnings.toFixed(2)}</span>
            <span className="stat-label">Faturamento Pendente</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.orders > 0 ? Math.round((stats.paidOrders / stats.orders) * 100) : 0}%</span>
            <span className="stat-label">Taxa de Pagamento</span>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="quick-actions">
          <button onClick={() => setView(View.Orders)} className="btn btn-secondary">
            📋 Ver Pedidos
          </button>
          <button onClick={() => setView(View.Billing)} className="btn btn-secondary">
            💰 Ver Cobranças
          </button>
          <button onClick={() => setView(View.Products)} className="btn btn-secondary">
            🍰 Gerenciar Produtos
          </button>
        </div>
      </section>
    )
  }

  const createOrder = () => {
    if (!customerName.trim()) {
      alert('Preencha o nome do cliente')
      return
    }

    if (orderItems.length === 0) {
      alert('Selecione ao menos 1 produto para montar o pedido')
      return
    }
    
    const phone = customerPhone.replace(/\D/g, '') // Remove caracteres não numéricos
    
    authenticatedFetch('/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 
        customerName, 
        customerPhone: phone,
        items: orderItems.map(({ name, price, quantity }) => ({ name, price, quantity })),
        discount: Math.max(0, orderDiscount || 0),
        total: orderTotal 
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((newOrder) => {
        setOrders([...orders, newOrder])
        setCustomerName('')
        setCustomerPhone('')
        setOrderTotal(0)
        setOrderDiscount(0)
        setOrderItems([])
        setSelectedProductId('')
        setSelectedQuantity(1)
        alert('Pedido criado com sucesso!')
      })
      .catch((err) => {
        console.error('Erro ao criar pedido:', err)
        alert(`Erro ao criar pedido: ${err.message}`)
      })
  }

  const renderOrders = () => (
    <section className="card">
      <div className="section-header">
        <h2 data-icon="📋">Meus Pedidos</h2>
        <button onClick={exportOrdersToCSV} className="btn btn-secondary" title="Exportar todos os pedidos para CSV">
          📥 Exportar CSV
        </button>
      </div>
      
      {/* Formulário para criar novo pedido */}
      <div className="order-form">
        <h3>➕ Novo Pedido</h3>
        <div className="form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="customer-name">Nome do Cliente:</label>
              <input
                id="customer-name"
                type="text"
                placeholder="Digite o nome do cliente"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="customer-phone">Telefone (opcional):</label>
              <input
                id="customer-phone"
                type="tel"
                placeholder="(11) 98765-4321"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
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
                <option value="">Selecione um produto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — R$ {p.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="order-qty">Quantidade:</label>
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
                onClick={() => {
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
                }}
                className="btn btn-secondary"
                disabled={!selectedProductId || products.length === 0}
                title={products.length === 0 ? 'Cadastre produtos primeiro' : 'Adicionar item ao pedido'}
              >
                ➕ Adicionar
              </button>
            </div>
          </div>

          {orderItems.length > 0 && (
            <div className="form-row">
              <div className="form-group" style={{width: '100%'}}>
                <label>Itens do Pedido:</label>
                <div className="order-items-list">
                  {orderItems.map((item) => (
                    <div key={item.productId} className="order-item-row">
                      <div>
                        <strong>{item.name}</strong>
                        <span style={{marginLeft: 8, color: 'var(--text-secondary)'}}>
                          {item.quantity}x — R$ {item.price.toFixed(2)}
                        </span>
                      </div>
                      <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                        <span style={{minWidth: 110, textAlign: 'right'}}>
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => setOrderItems((prev) => prev.filter((i) => i.productId !== item.productId))}
                          className="btn btn-sm btn-danger"
                          title="Remover item"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="order-discount">Desconto (R$):</label>
              <input
                id="order-discount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={orderDiscount || ''}
                onChange={(e) => setOrderDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="order-total">Total (R$):</label>
              <input
                id="order-total"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={orderTotal.toFixed(2)}
                readOnly
                className="form-input"
              />
            </div>
            <div className="form-group" style={{justifyContent: 'flex-end'}}>
              <button onClick={createOrder} className="btn btn-primary">
                ➕ Criar Pedido
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {orderLoading ? (
        <div className="loading">Carregando pedidos...</div>
      ) : (
        <ul className="orders">
          {orders.map((o) => (
            <li
              key={o.id}
              className={o.paid ? 'paid' : 'pending'}
            >
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
                  {o.paid && o.paidAt && (
                    <span className="payment-date">
                      💳 Pago em: {new Date(o.paidAt).toLocaleDateString('pt-BR', {
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
              <div className="order-actions">
                <span className="order-total">R$ {o.total.toFixed(2)}</span>
                <button 
                  onClick={() => toggleOrderPaid(o)} 
                  className="btn btn-sm btn-secondary"
                  title={o.paid ? 'Marcar como não pago' : 'Marcar como pago'}
                >
                  {o.paid ? '↩️' : '✅'}
                </button>
                <button 
                  onClick={() => deleteOrder(o)} 
                  className="btn btn-sm btn-danger"
                  title="Excluir pedido"
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )

  const sendWhatsAppToCustomer = (customerName: string, customerPhone?: string) => {
    openWhatsApp(customerName, customerPhone)
  }

  const exportOrdersToCSV = () => {
    if (orders.length === 0) {
      alert('Nenhum pedido para exportar.')
      return
    }

    const headers = [
      'ID',
      'Cliente',
      'Telefone',
      'Total',
      'Desconto',
      'Pago',
      'Data de Registro',
      'Data de Pagamento',
      'Itens'
    ]

    const rows = orders.map(order => {
      const itemsStr = order.items && order.items.length > 0
        ? order.items.map(item => `${item.name} (${item.quantity}x) = R$ ${(item.price * item.quantity).toFixed(2)}`).join('; ')
        : `Valor total = R$ ${order.total.toFixed(2)}`

      return [
        order.id,
        order.customerName,
        order.customerPhone || '',
        order.total.toFixed(2),
        (order.discount ?? 0).toFixed(2),
        order.paid ? 'Sim' : 'Não',
        order.date ? new Date(order.date).toLocaleString('pt-BR') : '',
        order.paidAt ? new Date(order.paidAt).toLocaleString('pt-BR') : '',
        itemsStr
      ]
    })

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `pedidos_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderBilling = () => {
    const pendingOrders = orders.filter(o => !o.paid)
    const totalPending = pendingOrders.reduce((sum, o) => sum + o.total, 0)
    
    // Agrupar pedidos por cliente
    const ordersByCustomer = pendingOrders.reduce((acc, order) => {
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
    
    return (
      <section className="card">
        <h2 data-icon="💰">Cobranças Pendentes</h2>
        
        {orderLoading ? (
          <div className="loading">Carregando cobranças...</div>
        ) : (
          <>
            <div className="billing-summary">
              <div className="summary-item">
                <span className="summary-label">Clientes Pendentes:</span>
                <span className="summary-value">{Object.keys(ordersByCustomer).length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total a Receber:</span>
                <span className="summary-value pending">R$ {totalPending.toFixed(2)}</span>
              </div>
            </div>

            {Object.keys(ordersByCustomer).length === 0 ? (
              <div className="empty-state">
                <h3>🎉 Nenhuma cobrança pendente!</h3>
                <p>Todos os pedidos estão pagos.</p>
              </div>
            ) : (
              <div className="billing-customers">
                {Object.entries(ordersByCustomer).map(([customerName, data]) => (
                  <div key={customerName} className="customer-card">
                    <div className="customer-header">
                      <div className="customer-info">
                        <h3>{customerName}</h3>
                        {data.phone && (
                          <span className="customer-phone">📱 {data.phone}</span>
                        )}
                        <span className="customer-total">R$ {data.total.toFixed(2)}</span>
                      </div>
                      <div className="customer-actions">
                        <button 
                          onClick={() => sendWhatsAppToCustomer(customerName, data.phone)} 
                          className="btn btn-sm btn-primary"
                          title="Enviar cobrança via WhatsApp"
                        >
                          💬 Cobrar
                        </button>
                      </div>
                    </div>
                    
                    <div className="customer-orders">
                      <h4>📋 Pedidos:</h4>
                      {data.orders.map(order => (
                        <div key={order.id} className="order-summary">
                          <div className="order-info">
                            <span className="order-id">Pedido {order.id}</span>
                            <div className="order-dates">
                              <span className="order-date">
                                📅 Registrado: {order.date ? new Date(order.date).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'Data não informada'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Detalhes dos itens */}
                          {order.items && order.items.length > 0 ? (
                            <div className="order-items">
                              {order.items.map((item, index) => (
                                <div key={index} className="order-item">
                                  <span className="item-name">{item.name}</span>
                                  <span className="item-quantity">({item.quantity}x)</span>
                                  <span className="item-price">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="order-items">
                              <div className="order-item">
                                <span className="item-name">Valor total do pedido</span>
                                <span className="item-price">R$ {order.total.toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                          
                          <div className="order-actions">
                            <button 
                              onClick={() => toggleOrderPaid(order)} 
                              className="btn btn-sm btn-success"
                              title="Marcar como pago"
                            >
                              ✅ Pagar
                            </button>
                            <button 
                              onClick={() => deleteOrder(order)} 
                              className="btn btn-sm btn-danger"
                              title="Excluir pedido"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    )
  }

  const renderProducts = () => {
    const addProduct = () => {
      if (!productName.trim() || productPrice <= 0) {
        alert('Preencha nome e preço válidos')
        return
      }
      
      authenticatedFetch('/api/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: productName, price: productPrice }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.json()
        })
        .then((p) => {
          setProducts([...products, p])
          setProductName('')
          setProductPrice(0)
          alert('Produto adicionado com sucesso!')
        })
        .catch((err) => {
          console.error('Erro ao adicionar produto:', err)
          alert(`Erro ao adicionar produto: ${err.message}`)
        })
    }
    
    return (
      <section className="card">
        <h2 data-icon="🍰">Meus Produtos</h2>
        {products.length === 0 ? (
          <p className="empty-state">Nenhum produto cadastrado. Adicione seu primeiro produto!</p>
        ) : (
          <ul className="orders">
            {products.map((p) => (
              <li key={p.id} className="product-item">
                <span className="product-name">{p.name}</span>
                <span className="product-price">R$ {p.price.toFixed(2)}</span>
                <div className="product-actions">
                  <button 
                    onClick={() => openEditModal(p)} 
                    className="btn btn-sm btn-secondary"
                    title="Editar produto"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => deleteProduct(p)} 
                    className="btn btn-sm btn-danger"
                    title="Excluir produto"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="form">
          <div className="form-row">
            <input
              placeholder="Nome do produto"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="form-input"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Preço (R$)"
              value={productPrice || ''}
              onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)}
              className="form-input"
            />
          </div>
          <button onClick={addProduct} className="btn btn-primary">
            ➕ Adicionar Produto
          </button>
        </div>
      </section>
    )
  }

  const renderSettings = () => {
    const saveSettings = () => {
      changeSetting({ theme, whatsapp_webhook: webhook })
      alert('Configurações salvas!')
    }
    
    return (
      <section className="card">
        <h2 data-icon="⚙️">Configurações do Sistema</h2>
        <div className="form">
          <div className="form-group">
            <label htmlFor="theme">Tema do Aplicativo:</label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="form-select"
            >
              <option value="light">☀️ Claro</option>
              <option value="dark">🌙 Escuro</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="webhook">Webhook do WhatsApp:</label>
            <input
              id="webhook"
              type="url"
              placeholder="https://webhook.whatsapp.com/..."
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              className="form-input"
            />
          </div>
          
          <button onClick={saveSettings} className="btn btn-primary">
            💾 Salvar Configurações
          </button>
        </div>
        
        <div className="settings-info">
          <h3>ℹ️ Informações Atuais</h3>
          <p><strong>Tema:</strong> {settings.theme ? getThemeName(settings.theme) : 'Claro'}</p>
          <p><strong>Webhook WhatsApp:</strong> {settings.whatsapp_webhook ? '✅ Configurado' : '❌ Não configurado'}</p>
        </div>
      </section>
    )
  }

  const getPageTitle = () => {
    const titles = {
      [View.Home]: 'Visão Geral',
      [View.Orders]: 'Pedidos',
      [View.Billing]: 'Cobranças',
      [View.Products]: 'Produtos',
      [View.Settings]: 'Configurações'
    }
    return titles[view]
  }

  return (
    <div className="app-root">
      {loading ? (
        <div className="loading-container">
          <div className="loading">Carregando...</div>
        </div>
      ) : !isAuthenticated ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          {/* Mobile Menu Overlay */}
          {sidebarOpen && (
            <div className="menu-overlay open" onClick={closeSidebar} />
          )}
          
          {/* Sidebar */}
          {renderSidebar()}
          
          {/* Mobile Menu Toggle */}
          <button className="mobile-menu-toggle" onClick={toggleSidebar}>
            ☰
          </button>
          
          {/* Main Content */}
          <div className="main-content">
            <header className="main-header">
              <h2>{getPageTitle()}</h2>
              <div className="header-actions">
                {view === View.Billing && (
                  <button onClick={() => openWhatsApp()} className="btn btn-primary btn-sm">
                    💬 Enviar Cobrança
                  </button>
                )}
                <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Sair">
                  🚪 Sair
                </button>
              </div>
            </header>
            
            <main>
              {view === View.Home && renderHome()}
              {view === View.Orders && renderOrders()}
              {view === View.Billing && renderBilling()}
              {view === View.Products && renderProducts()}
              {view === View.Settings && renderSettings()}
            </main>
            
            <footer className="footer">
              🧁 Dona Nice — Sistema de Gestão | Tema: {getThemeName(settings.theme || 'light')}
            </footer>
          </div>
        </>
      )}
    </div>
  )
}
