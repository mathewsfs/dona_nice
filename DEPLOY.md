# 🚀 Deploy Produção - Dona Nice App

## 📋 Visão Geral

Este documento explica como fazer deploy da Dona Nice App em ambiente Docker com automação de pagamentos via Cron Job.

## 🏗️ Arquitetura

### Componentes
- **Frontend**: React/Vite servido pelo backend
- **Backend**: Node.js/Express com API REST
- **Banco**: JSON local (persistido em volume)
- **Cron Job**: Verificação automática de pagamentos pendentes
- **Webhook**: Envio automático de mensagens WhatsApp

### 4 Momentos de Disparo Automático
1. **Pedido Registrado** → Imediato (frontend)
2. **Pedido Pago** → Imediato (frontend)
3. **Vencimento Hoje** → A cada hora (backend/cron)
4. **Cobrança Manual** → Ao clicar botão (frontend)

## 🐳 Deploy com Docker

### 1. Usando Docker Compose (Recomendado - Sem Cron)

```bash
# Clonar repositório
git clone <repositorio>
cd dona-nice-app

# Build e iniciar serviços (SEM CRON)
docker-compose -f docker-compose.production.yml up -d

# Verificar logs
docker-compose -f docker-compose.production.yml logs -f
```

### 1.1. Usando Docker Compose COM Cron

```bash
# Para ativar o cron job automático
docker-compose -f docker-compose.cron.yml up -d

# Verificar logs do cron
docker-compose -f docker-compose.cron.yml logs dona-nice-cron
```

### 2. Docker Puro

```bash
# Build da imagem
docker build -t dona-nice-app .

# Executar container
docker run -d \
  --name dona-nice-app \
  -p 3001:3001 \
  -v $(pwd)/backend/data:/app/data \
  -v $(pwd)/backend/logs:/var/log \
  dona-nice-app
```

## ⏰ Configuração do Cron Job

### Opção 1: Cron Container (Docker Compose)

O `docker-compose.production.yml` já inclui um serviço separado para o cron:

```yaml
dona-nice-cron:
  # Executa verificação a cada hora
  command: ["sh", "-c", "while true; do sleep 3600; /app/scripts/check-due-payments.sh; done"]
```

### Opção 2: Cron do Host (Recomendado para produção)

1. **Copiar o script**:
```bash
cp backend/scripts/check-due-payments.sh /usr/local/bin/dona-nice-cron.sh
chmod +x /usr/local/bin/dona-nice-cron.sh
```

2. **Configurar crontab**:
```bash
# Editar crontab
crontab -e

# Adicionar linha (executar a cada hora)
0 * * * * /usr/local/bin/dona-nice-cron.sh

# Salvar e sair
```

3. **Verificar crontab**:
```bash
crontab -l
```

### Opção 3: Cron Externo (Cloud)

Para serviços de nuvem (AWS, Google Cloud, etc.):

```bash
# URL do endpoint
curl -X POST \
  https://seu-dominio.com/api/cron/check-due-payments \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 🔧 Configurações

### Variáveis de Ambiente

```bash
NODE_ENV=production
PORT=3001
API_URL=http://localhost:3001
```

### Webhook WhatsApp

Configure na interface:
1. Acesse: `http://localhost:3001`
2. Vá em: Configurações → WhatsApp Webhook
3. Insira: `https://seu-webhook.com/endpoint`
4. Configure as 4 mensagens personalizadas

## 📊 Monitoramento

### Logs do Sistema

```bash
# Logs da aplicação
docker-compose -f docker-compose.production.yml logs dona-nice-app

# Logs do cron
docker-compose -f docker-compose.production.yml logs dona-nice-cron

# Logs de verificação de pagamentos
tail -f /var/log/dona-nice-cron.log
```

### Health Check

```bash
# Verificar se aplicação está saudável
curl http://localhost:3001/api/health

# Resposta esperada
{"ok":true}
```

## 🔒 Segurança

### Firewall

```bash
# Liberar porta 3001
ufw allow 3001/tcp

# Ou apenas para IPs específicos
ufw allow from 192.168.1.0 to any port 3001
```

### HTTPS (Opcional)

Para produção, configure reverse proxy com Nginx:

```nginx
server {
    listen 443 ssl;
    server_name seu-dominio.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
}
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **Cron não executa**:
   - Verifique permissões: `chmod +x script.sh`
   - Verifique crontab: `crontab -l`
   - Verifique logs: `/var/log/cron` ou `/var/log/syslog`

2. **Webhook não funciona**:
   - Teste manualmente: `curl -X POST URL_WEBHOOK`
   - Verifique se URL está acessível
   - Confirme caracteres especiais (sem &#x2F;)

3. **Container não inicia**:
   - Verifique volumes: `docker volume ls`
   - Verifique portas: `netstat -tlnp | grep 3001`
   - Verifique logs: `docker logs container-name`

### Debug Endpoint

```bash
# Testar endpoint de verificação manualmente
curl -X POST \
  http://localhost:3001/api/cron/check-due-payments \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

## 📈 Escalabilidade

### Múltiplas Instâncias

```yaml
# docker-compose.production.yml
services:
  dona-nice-app-1:
    # ... configuração
  dona-nice-app-2:
    # ... configuração
  nginx:
    # Load balancer
```

### Banco de Dados Externo

Para produção, considere migrar para PostgreSQL/MongoDB:

```javascript
// Em backend/src/index.js
const { Pool } = require('pg')
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})
```

## 🔄 Backup

### Automático

```bash
# Script de backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf backup_$DATE.tar.gz backend/data/
aws s3 cp backup_$DATE.tar.gz s3://backups/dona-nice/
```

### Restore

```bash
# Restaurar backup
docker-compose down
tar -xzf backup_20240308_120000.tar.gz
docker-compose up -d
```

## 📞 Suporte

### Endpoints Úteis

- **Health Check**: `GET /api/health`
- **Verificação Manual**: `POST /api/cron/check-due-payments`
- **Logs**: `/var/log/dona-nice-cron.log`

### Contato

- **Issues**: GitHub Repository
- **Documentação**: README.md
- **Logs**: Verificar logs do container

---

## ✅ Checklist de Deploy

- [ ] Docker e Docker Compose instalados
- [ ] Variáveis de ambiente configuradas
- [ ] Volumes criados com permissões corretas
- [ ] Firewall configurado
- [ ] Cron job instalado e testado
- [ ] Webhook configurado e testado
- [ ] Health check funcionando
- [ ] Logs sendo coletados
- [ ] Backup automatizado configurado

**Pronto para produção!** 🎉
