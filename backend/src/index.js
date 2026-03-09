const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const validator = require('validator')
const crypto = require('crypto')

const IS_PACKAGED = Boolean(process.pkg)
const RUNTIME_DIR = IS_PACKAGED ? path.dirname(process.execPath) : path.join(__dirname, '..')
const DATA_DIR = path.join(RUNTIME_DIR, 'data')
const DB_PATH = path.join(DATA_DIR, 'db.json')
const DB_TEMPLATE_PATH = path.join(__dirname, '..', 'data', 'db.json')

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function ensureRuntimePublic() {
  if (!IS_PACKAGED) return
  try {
    const snapshotPublic = path.join(__dirname, '..', 'public')
    const runtimePublic = path.join(RUNTIME_DIR, 'public')
    if (!fs.existsSync(snapshotPublic)) {
      return
    }

    // Copia apenas se não existir (ou se estiver vazio)
    const shouldCopy = !fs.existsSync(runtimePublic) || fs.readdirSync(runtimePublic).length === 0
    if (shouldCopy) {
      fs.mkdirSync(runtimePublic, { recursive: true })
      copyDirSync(snapshotPublic, runtimePublic)
    }
  } catch (e) {
    console.error('Falha ao preparar arquivos do frontend:', e)
  }
}

function ensureRuntimeDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    if (!fs.existsSync(DB_PATH)) {
      const template = fs.existsSync(DB_TEMPLATE_PATH)
        ? fs.readFileSync(DB_TEMPLATE_PATH, 'utf-8')
        : JSON.stringify({ products: [], customers: [], orders: [], settings: {}, users: [] }, null, 2)
      fs.writeFileSync(DB_PATH, template)
    }
  } catch (e) {
    console.error('Falha ao preparar banco de dados:', e)
  }
}

ensureRuntimeDB()
ensureRuntimePublic()
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET é obrigatório em produção')}
// Gerar secret único se não existir em desenvolvimento
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex')

// Rate limiting - mais restrito
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Aumentado para 500 requests por windowMs
  message: 'Muitas requisições deste IP, tente novamente mais tarde',
  standardHeaders: true,
  legacyHeaders: false,
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Aumentado para 50 tentativas
  message: 'Muitas tentativas de login, tente novamente mais tarde',
  skipSuccessfulRequests: true,
})

// Middleware de validação e sanitização
function validateAndSanitize(req, res, next) {
  try {
    // Sanitização básica para todos os campos string
    if (req.body) {
      for (const key in req.body) {
        if (typeof req.body[key] === 'string') {
          // Não escapar URLs (webhook) para preservar caracteres especiais
          if (key === 'whatsapp_webhook' || key.includes('webhook')) {
            req.body[key] = req.body[key].trim()
          } else {
            req.body[key] = validator.escape(req.body[key].trim())
          }
        }
      }
    }
    next()
  } catch (error) {
    res.status(400).json({ error: 'Dados inválidos' })
  }
}

function validateOrder(req, res, next) {
  const { customerName, customerPhone, items, discount, total } = req.body
  
  if (!customerName || validator.isEmpty(customerName)) {
    return res.status(400).json({ error: 'Nome do cliente é obrigatório' })
  }
  
  if (customerPhone && !validator.isMobilePhone(customerPhone, 'pt-BR')) {
    return res.status(400).json({ error: 'Telefone inválido' })
  }
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Itens do pedido são obrigatórios' })
  }
  
  if (discount && (isNaN(discount) || discount < 0)) {
    return res.status(400).json({ error: 'Desconto inválido' })
  }
  
  if (isNaN(total) || total < 0) {
    return res.status(400).json({ error: 'Total inválido' })
  }
  
  next()
}

function validateProduct(req, res, next) {
  const { name, price } = req.body
  
  if (!name || validator.isEmpty(name)) {
    return res.status(400).json({ error: 'Nome do produto é obrigatório' })
  }
  
  if (isNaN(price) || price <= 0) {
    return res.status(400).json({ error: 'Preço inválido' })
  }
  
  next()
}

// Cache simples em memória
let dbCache = null
let cacheTimestamp = 0
const CACHE_TTL = 30000 // 30 segundos

function readDB(){
  try {
    const now = Date.now()
    if (dbCache && (now - cacheTimestamp) < CACHE_TTL) {
      return dbCache
    }
    
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
    dbCache = data
    cacheTimestamp = now
    return data
  } catch(e) { 
    return {products:[],customers:[],orders:[],settings:{},users:[]} 
  }
}

function writeDB(data){
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8')
  dbCache = data
  cacheTimestamp = Date.now()
}

function invalidateCache(){
  dbCache = null
  cacheTimestamp = 0
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado' })
    }
    req.user = user
    next()
  })
}

const app = express()
app.set('trust proxy', 1)

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}))
app.use(limiter)

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? allowedOrigins.length > 0 
      ? allowedOrigins 
      : ['http://localhost:5173', 'http://localhost:3000']
    : true,
  credentials: true,
}))
app.use(bodyParser.json({ limit: '5mb' })) // Reduzido de 10mb
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }))
app.use(validateAndSanitize) // Aplicar sanitização global

app.get('/api/health', (req,res)=> res.json({ok:true}))

// Teste de conectividade
app.get('/test-connectivity', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'test-connectivity.html'))
})

// Debug Safari
app.get('/debug-safari', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'debug-safari.html'))
})

// Authentication endpoints
app.post('/api/auth/login', loginLimiter, async (req,res)=>{
  try {
    const { username, password } = req.body
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' })
    }

    const db = readDB()
    const user = db.users?.find(u => u.username === username)
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' })
    }

    const token = jwt.sign(
      { id: user.id, username: user.username }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    )

    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

app.post('/api/auth/register', (req, res) => {
  res.status(404).json({ error: 'Cadastro desabilitado' })
})

// Protected routes
app.get('/api/orders', authenticateToken, (req,res)=>{
  const db = readDB()
  res.json(db.orders || [])
})

app.post('/api/orders', authenticateToken, validateOrder, (req,res)=>{
  const db = readDB()
  const order = req.body
  order.id = String(Date.now())
  order.date = order.date || new Date().toISOString()
  order.paid = order.paid || false
  order.items = order.items || [] // Incluir itens do pedido
  
  // Garantir que customerPhone seja incluído
  if (!order.customerPhone && order.customerName) {
    // Tentar encontrar o telefone do cliente existente
    const customer = db.customers.find(c => c.name === order.customerName)
    order.customerPhone = customer ? customer.phone : ''
  }
  db.orders.push(order)
  writeDB(db)
  invalidateCache() // Invalidar cache após modificação
  res.status(201).json(order)
})

app.delete('/api/orders/:id', authenticateToken, (req,res)=>{
  const db = readDB()
  db.orders = db.orders.filter(o=>o.id!==req.params.id)
  writeDB(db)
  invalidateCache() // Invalidar cache após modificação
  res.json({deleted:true})
})

app.put('/api/orders/:id', authenticateToken, (req,res)=>{
  const db = readDB()
  const idx = db.orders.findIndex(o=>o.id===req.params.id)
  if(idx===-1) return res.status(404).json({error:'not found'})
  
  const updatedOrder = Object.assign({}, db.orders[idx], req.body)
  
  // Se o pedido foi marcado como pago e não tinha data de pagamento, adicionar data atual
  if (req.body.paid === true && !db.orders[idx].paidAt) {
    updatedOrder.paidAt = new Date().toISOString()
  }
  
  db.orders[idx] = updatedOrder
  writeDB(db)
  invalidateCache() // Invalidar cache após modificação
  res.json(db.orders[idx])
})

// products CRUD
app.get('/api/products', authenticateToken, (req,res)=>{
  const db = readDB()
  res.json(db.products || [])
})
app.post('/api/products', authenticateToken, validateProduct, (req,res)=>{
  const db = readDB()
  const prod = req.body
  prod.id = String(Date.now())
  db.products.push(prod)
  writeDB(db)
  invalidateCache() // Invalidar cache após modificação
  res.status(201).json(prod)
})
app.put('/api/products/:id', authenticateToken, validateProduct, (req,res)=>{
  const db = readDB()
  const idx = db.products.findIndex(p=>p.id===req.params.id)
  if(idx===-1) return res.status(404).json({error:'not found'})
  db.products[idx] = Object.assign({}, db.products[idx], req.body)
  writeDB(db)
  invalidateCache() // Invalidar cache após modificação
  res.json(db.products[idx])
})
app.delete('/api/products/:id', authenticateToken, (req,res)=>{
  const db = readDB()
  db.products = db.products.filter(p=>p.id!==req.params.id)
  writeDB(db)
  invalidateCache() // Invalidar cache após modificação
  res.json({deleted:true})
})

app.get('/api/customers', authenticateToken, (req,res)=>{
  const db = readDB()
  res.json(db.customers || [])
})

app.get('/api/settings', authenticateToken, (req,res)=>{
  const db = readDB()
  res.json(db.settings || {})
})

// Endpoint público para cron job externo (sem autenticação)
app.post('/api/cron/check-due-payments', (req, res) => {
  try {
    const db = readDB()
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Zerar hora para comparar apenas data
    
    // Filtrar pedidos que vencem hoje e ainda não foram notificados
    const dueOrders = db.orders.filter(order => 
      !order.paid && 
      order.paymentDueDate && 
      !order.paymentNotified
    )
    
    let notificationsSent = 0
    
    for (const order of dueOrders) {
      const dueDate = new Date(order.paymentDueDate)
      dueDate.setHours(0, 0, 0, 0)
      
      if (dueDate.getTime() === today.getTime()) {
        // Enviar notificação via webhook
        const settings = db.settings || {}
        if (settings.whatsapp_webhook && order.customerPhone) {
          const message = (settings.wa_payment_due_template || 
            "Olá {name}! 😊\n\nLembrete amigável da Dona Nice 🧁\n\n📋 *Seu pedido:* #{orderId}\n💰 *Valor:* R$ {total}\n\n📅 *Previsão de pagamento vence hoje!*\n\nPor favor, nos avise quando puder realizar o pagamento. Aceitamos PIX, dinheiro ou cartão na entrega!\n\n🍰 *Dona Nice - Doces Caseiros*\n\nObrigado! ❤️")
            .replace(/{name}/g, order.customerName)
            .replace(/{orderId}/g, order.id)
            .replace(/{total}/g, order.total.toFixed(2))
          
          fetch(settings.whatsapp_webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: order.customerPhone,
              message: message,
              customerName: order.customerName,
              orderId: order.id,
              total: order.total,
              paymentDueDate: order.paymentDueDate,
              notificationType: 'payment_due'
            })
          })
            .then(() => {
              console.log(`[CRON] Notificação de vencimento enviada para pedido ${order.id}`)
              notificationsSent++
              
              // Marcar como notificado
              const orderIndex = db.orders.findIndex(o => o.id === order.id)
              if (orderIndex !== -1) {
                db.orders[orderIndex].paymentNotified = true
              }
            })
            .catch((err) => {
              console.error(`[CRON] Erro ao enviar notificação para pedido ${order.id}:`, err)
            })
        }
      }
    }
    
    // Salvar alterações se houver notificações enviadas
    if (notificationsSent > 0) {
      writeDB(db)
      invalidateCache()
    }
    
    console.log(`[CRON] Verificação concluída: ${dueOrders.length} pedidos verificados, ${notificationsSent} notificações enviadas`)
    
    res.json({ 
      success: true, 
      checkedOrders: dueOrders.length,
      notificationsSent: notificationsSent,
      date: today.toISOString(),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[CRON] Erro ao verificar pagamentos pendentes:', error)
    res.status(500).json({ 
      error: 'Erro ao verificar pagamentos pendentes',
      timestamp: new Date().toISOString()
    })
  }
})

// Endpoint para verificar e enviar notificações de vencimento
app.post('/api/check-due-payments', authenticateToken, (req, res) => {
  try {
    const db = readDB()
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Zerar hora para comparar apenas data
    
    // Filtrar pedidos que vencem hoje e ainda não foram notificados
    const dueOrders = db.orders.filter(order => 
      !order.paid && 
      order.paymentDueDate && 
      !order.paymentNotified
    )
    
    let notificationsSent = 0
    
    for (const order of dueOrders) {
      const dueDate = new Date(order.paymentDueDate)
      dueDate.setHours(0, 0, 0, 0)
      
      if (dueDate.getTime() === today.getTime()) {
        // Enviar notificação via webhook
        const settings = db.settings || {}
        if (settings.whatsapp_webhook && order.customerPhone) {
          const message = (settings.wa_payment_due_template || 
            "Olá {name}! 😊\n\nLembrete amigável da Dona Nice 🧁\n\n📋 *Seu pedido:* #{orderId}\n💰 *Valor:* R$ {total}\n\n📅 *Previsão de pagamento vence hoje!*\n\nPor favor, nos avise quando puder realizar o pagamento. Aceitamos PIX, dinheiro ou cartão na entrega!\n\n🍰 *Dona Nice - Doces Caseiros*\n\nObrigado! ❤️")
            .replace(/{name}/g, order.customerName)
            .replace(/{orderId}/g, order.id)
            .replace(/{total}/g, order.total.toFixed(2))
          
          fetch(settings.whatsapp_webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: order.customerPhone,
              message: message,
              customerName: order.customerName,
              orderId: order.id,
              total: order.total,
              paymentDueDate: order.paymentDueDate,
              notificationType: 'payment_due'
            })
          })
            .then(() => {
              console.log(`Notificação de vencimento enviada para pedido ${order.id}`)
              notificationsSent++
              
              // Marcar como notificado
              const orderIndex = db.orders.findIndex(o => o.id === order.id)
              if (orderIndex !== -1) {
                db.orders[orderIndex].paymentNotified = true
              }
            })
            .catch((err) => {
              console.error(`Erro ao enviar notificação para pedido ${order.id}:`, err)
            })
        }
      }
    }
    
    // Salvar alterações se houver notificações enviadas
    if (notificationsSent > 0) {
      writeDB(db)
      invalidateCache()
    }
    
    res.json({ 
      success: true, 
      checkedOrders: dueOrders.length,
      notificationsSent: notificationsSent,
      date: today.toISOString()
    })
  } catch (error) {
    console.error('Erro ao verificar pagamentos pendentes:', error)
    res.status(500).json({ error: 'Erro ao verificar pagamentos pendentes' })
  }
})

app.put('/api/settings', authenticateToken, (req,res)=>{
  const db = readDB()
  db.settings = Object.assign({}, db.settings, req.body)
  writeDB(db)
  invalidateCache() // Invalidar cache após modificação
  res.json(db.settings)
})

// Stats endpoint with date filtering
app.get('/api/stats', authenticateToken, (req,res)=>{
  const db = readDB()
  const { month, year } = req.query
  
  // Default to current month if not specified
  const now = new Date()
  const targetMonth = month ? parseInt(month) : now.getMonth() + 1
  const targetYear = year ? parseInt(year) : now.getFullYear()
  
  const filteredOrders = db.orders.filter(order => {
    if (!order.date) return false
    const orderDate = new Date(order.date)
    return orderDate.getMonth() + 1 === targetMonth && orderDate.getFullYear() === targetYear
  })
  
  const totalOrders = filteredOrders.length
  const paidOrders = filteredOrders.filter(o => o.paid).length
  const pendingOrders = totalOrders - paidOrders
  const totalEarnings = filteredOrders.filter(o => o.paid).reduce((sum, o) => sum + o.total, 0)
  const pendingEarnings = filteredOrders.filter(o => !o.paid).reduce((sum, o) => sum + o.total, 0)
  
  res.json({
    orders: totalOrders,
    paidOrders,
    pendingOrders,
    earnings: totalEarnings,
    pendingEarnings,
    month: targetMonth,
    year: targetYear
  })
})

// Static frontend
// - When packaged with pkg, we extract bundled public/ to runtime/public and serve from disk
// - When running normally, prefer runtime/public (copied build) then fallback to frontend/dist
const PUBLIC_DIR = path.join(RUNTIME_DIR, 'public')
const FRONTEND_DIST_DIR = path.join(__dirname, '..', '..', 'frontend', 'dist')

let STATIC_DIR = null
if (IS_PACKAGED) {
  STATIC_DIR = fs.existsSync(PUBLIC_DIR) ? PUBLIC_DIR : null
} else {
  STATIC_DIR = fs.existsSync(PUBLIC_DIR) ? PUBLIC_DIR : (fs.existsSync(FRONTEND_DIST_DIR) ? FRONTEND_DIST_DIR : null)
}

if (STATIC_DIR) {
  app.use(express.static(STATIC_DIR))

  // SPA fallback (React Router)
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).end()
    const indexPath = path.join(STATIC_DIR, 'index.html')
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath)
    }
    return res.status(404).end()
  })
}

const port = process.env.PORT || 3001
const host = process.env.HOST || '0.0.0.0'
app.listen(port, host, () => {
  console.log(`Backend listening on ${host}:${port}`)
  console.log(`Local: http://localhost:${port}`)
  console.log('LAN: use o IP do computador (ex: http://192.168.0.10:' + port + ')')
})
