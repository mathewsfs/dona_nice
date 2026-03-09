# 🚀 Opções de Deploy - Dona Nice App

## 📋 Visão Geral

Este documento explica as diferentes opções de deploy disponíveis para a Dona Nice App.

## 🎯 Escolha Rápida

### ✅ **Para Produção (Recomendado)**
```bash
docker-compose -f docker-compose.production.yml up -d
```
- **Apenas aplicação** (sem cron automático)
- **Cron via host** ou manual
- **Mais leve** e **estável**

### ⏰ **Para Produção com Cron Automático**
```bash
docker-compose -f docker-compose.cron.yml up -d
```
- **Aplicação + cron** automático
- **Verificação a cada hora**
- **Mais recursos** consumidos

### 🛠️ **Para Desenvolvimento**
```bash
docker-compose up -d
```
- **Ambiente de dev**
- **Hot reload**
- **Debug ativo**

## 🏗️ Arquitetura dos Arquivos

### 📁 **Arquivos de Deploy**
```
├── docker-compose.yml              # Desenvolvimento
├── docker-compose.production.yml    # Produção (sem cron)
├── docker-compose.cron.yml        # Produção (com cron)
├── docker-compose.portainer.yml   # Portainer
└── DEPLOY.md                   # Documentação completa
```

### 📋 **Diferenças Entre Arquivos**

| Arquivo | Aplicação | Cron | Uso | Recursos |
|---------|------------|-------|------|----------|
| `docker-compose.yml` | ✅ | ❌ | Desenvolvimento | Mínimo |
| `docker-compose.production.yml` | ✅ | ❌ | Produção | Leve |
| `docker-compose.cron.yml` | ✅ | ✅ | Produção | Médio |
| `docker-compose.portainer.yml` | ✅ | ❌ | Portainer | Médio |

## 🚀 Como Funciona Cada Opção

### 1. **docker-compose.yml** (Desenvolvimento)
```yaml
# Apenas aplicação principal
services:
  dona-nice-app:
    # Build de desenvolvimento
    # Hot reload
    # Debug ativo
```

**Características:**
- ✅ **Hot reload** automático
- ✅ **Debug mode** ativo
- ✅ **Logs detalhados**
- ✅ **Build rápido**
- ❌ **Sem otimizações** de produção

### 2. **docker-compose.production.yml** (Produção - Sem Cron)
```yaml
# Apenas aplicação principal otimizada
services:
  dona-nice-app:
    # Build de produção
    # Health checks
    # Restart automático
```

**Características:**
- ✅ **Build otimizado**
- ✅ **Health checks**
- ✅ **Restart automático**
- ✅ **Leve e rápido**
- ❌ **Sem cron automático**

### 3. **docker-compose.cron.yml** (Produção com Cron)
```yaml
# Aplicação + serviço de cron
services:
  dona-nice-app:
    # Aplicação principal
  dona-nice-cron:
    # Serviço de cron
    # Verificação a cada hora
```

**Características:**
- ✅ **Build otimizado**
- ✅ **Cron automático**
- ✅ **Verificação horária**
- ✅ **Logs centralizados**
- ⚠️ **Mais recursos**

## ⏰ Sistema de Cron

### 🔄 **Como Funciona**

#### **Opção A: Cron Automático (Docker)**
```bash
# Usar arquivo com cron
docker-compose -f docker-compose.cron.yml up -d

# Verificar logs do cron
docker-compose -f docker-compose.cron.yml logs dona-nice-cron
```

**Vantagens:**
- ✅ **Automático** e independente
- ✅ **Logs centralizados**
- ✅ **Restart automático**

**Desvantagens:**
- ⚠️ **Consome mais recursos**
- ⚠️ **Mais complexo** de debugar

#### **Opção B: Cron Manual (Host)**
```bash
# Usar arquivo sem cron
docker-compose -f docker-compose.production.yml up -d

# Configurar cron no host
crontab -e
# Adicionar: 0 * * * * curl -X POST http://localhost:3001/api/cron/check-due-payments
```

**Vantagens:**
- ✅ **Mais leve**
- ✅ **Controle total** do host
- ✅ **Debug mais fácil**

**Desvantagens:**
- ⚠️ **Configuração manual**
- ⚠️ **Depende do host**

## 🎯 Recomendações

### 🏭 **Para Produção**
**Use:** `docker-compose.production.yml`
```bash
# Deploy produção leve e estável
docker-compose -f docker-compose.production.yml up -d

# Configure cron no host se necessário
crontab -e
# 0 * * * * curl -X POST http://localhost:3001/api/cron/check-due-payments -H "Content-Type: application/json" -d '{}'
```

### ⏰ **Para Produção com Automação**
**Use:** `docker-compose.cron.yml`
```bash
# Deploy produção com cron automático
docker-compose -f docker-compose.cron.yml up -d

# Verificar logs
docker-compose -f docker-compose.cron.yml logs -f
```

### 🛠️ **Para Desenvolvimento**
**Use:** `docker-compose.yml`
```bash
# Deploy desenvolvimento
docker-compose up -d

# Acompanhar mudanças
docker-compose logs -f
```

## 📊 Comparação de Recursos

| Deploy | CPU | Memória | Disco | Rede | Complexidade |
|--------|------|---------|--------|-------|-------------|
| Dev | Baixa | Média | Pequeno | Baixa |
| Prod (sem cron) | Baixa | Baixa | Pequeno | Média |
| Prod (com cron) | Média | Média | Médio | Alta |

## 🔄 Migração Entre Deploy

### **De Desenvolvimento para Produção**
```bash
# Parar desenvolvimento
docker-compose down

# Iniciar produção
docker-compose -f docker-compose.production.yml up -d

# Verificar status
docker-compose -f docker-compose.production.yml ps
```

### **Ativar Cron Depois do Deploy**
```bash
# Parar produção sem cron
docker-compose -f docker-compose.production.yml down

# Iniciar produção com cron
docker-compose -f docker-compose.cron.yml up -d
```

## 🚨 Troubleshooting

### **Problemas Comuns**

#### **Cron Não Funciona**
```bash
# Verificar se serviço está rodando
docker-compose -f docker-compose.cron.yml ps

# Verificar logs do cron
docker-compose -f docker-compose.cron.yml logs dona-nice-cron

# Testar manualmente
curl -X POST http://localhost:3001/api/cron/check-due-payments
```

#### **Aplicação Não Inicia**
```bash
# Verificar logs
docker-compose -f docker-compose.production.yml logs dona-nice-app

# Verificar saúde
curl http://localhost:3001/api/health

# Reconstruir imagem
docker-compose -f docker-compose.production.yml up -d --build
```

#### **Recursos Insuficientes**
```bash
# Verificar uso de recursos
docker stats

# Aumentar limites se necessário
# Editar docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
```

## 📚 Documentação Adicional

- **DEPLOY.md**: Documentação completa de deploy
- **README.md**: Visão geral do projeto
- **backend/scripts/crontab.example**: Exemplos de cron

## 🎉 Conclusão

**Escolha o arquivo de deploy conforme sua necessidade:**

- 🛠️ **Desenvolvimento**: `docker-compose.yml`
- 🏭 **Produção leve**: `docker-compose.production.yml`
- ⏰ **Produção com cron**: `docker-compose.cron.yml`

**Todos os arquivos estão prontos para uso!** 🚀✨
