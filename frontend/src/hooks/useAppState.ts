import { useState, useEffect } from 'react'
import { authService } from '../services/auth'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'

export type Order = {
  id: string
  customerName: string
  customerPhone?: string
  total: number
  discount?: number
  paid: boolean
  date?: string
  paidAt?: string
  paymentDueDate?: string // Previsão de pagamento
  paymentNotified?: boolean // Flag para controle de notificações
  items?: { name: string; quantity: number; price: number }[]
}

export type Customer = { id: string; name: string; phone: string }

export type Stats = {
  orders: number
  paidOrders: number
  pendingOrders: number
  earnings: number
  pendingEarnings: number
  month: number
  year: number
}

export type Product = { id: string; name: string; price: number }

export type Settings = { 
  theme?: string; 
  whatsapp_webhook?: string; 
  wa_template?: string;
  wa_order_created_template?: string;
  wa_order_paid_template?: string;
  wa_payment_due_template?: string;
  wa_manual_billing_template?: string;
}

export enum View {
  Home = 'inicio',
  Orders = 'pedidos',
  Billing = 'cobrancas',
  Products = 'produtos',
  Settings = 'configuracoes',
}

export function useAppState() {
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

    const fullUrl = url.startsWith('/api') ? `${API_BASE}${url.substring(4)}` : url

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        // Add timeout for mobile
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      // Handle 401 Unauthorized
      if (response.status === 401) {
        authService.logout()
        setIsAuthenticated(false)
        throw new Error('Sessão expirada')
      }

      // Handle other HTTP errors
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response
    } catch (error) {
      // Handle network errors gracefully
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Tempo limite excedido')
        }
        if (error.name === 'TypeError') {
          throw new Error('Erro de conexão')
        }
        throw error
      }
      throw new Error('Erro desconhecido')
    }
  }

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    authService.logout()
    setIsAuthenticated(false)
  }

  // Load data based on current view
  useEffect(() => {
    if (!isAuthenticated) return

    const loadData = async () => {
      try {
        if (view === View.Orders) {
          setOrderLoading(true)
          const ordersResponse = await authenticatedFetch('/api/orders')
          const ordersData = await ordersResponse.json()
          setOrders(ordersData)

          // Carregar produtos também para permitir selecionar itens no pedido
          try {
            const productsResponse = await authenticatedFetch('/api/products')
            const productsData = await productsResponse.json()
            setProducts(productsData)
          } catch (err) {
            console.error('Erro ao carregar produtos:', err)
          }
        }
        if (view === View.Billing) {
          setOrderLoading(true)
          const ordersResponse = await authenticatedFetch('/api/orders')
          const ordersData = await ordersResponse.json()
          setOrders(ordersData)
        }
        if (view === View.Products) {
          const productsResponse = await authenticatedFetch('/api/products')
          const productsData = await productsResponse.json()
          setProducts(productsData)
        }
        if (view === View.Home) {
          const statsResponse = await authenticatedFetch(`/api/stats?month=${selectedMonth}&year=${selectedYear}`)
          const statsData = await statsResponse.json()
          setStats(statsData)
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
        // Silently handle error in mobile - don't show alerts
        if (view === View.Orders || view === View.Billing) {
          setOrders([])
        }
        if (view === View.Products) {
          setProducts([])
        }
        if (view === View.Home) {
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
        }
      } finally {
        setOrderLoading(false)
      }
    }

    loadData()
  }, [view, selectedMonth, selectedYear, isAuthenticated])

  useEffect(() => {
    authenticatedFetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setSettings(data)
      })
  }, [])

  return {
    // State
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
    
    // Actions
    setView,
    setSelectedMonth,
    setSelectedYear,
    setOrders,
    setProducts,
    setSettings,
    handleLogin,
    handleLogout,
    authenticatedFetch
  }
}
