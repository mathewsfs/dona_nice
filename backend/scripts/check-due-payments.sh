#!/bin/bash

# Script de Cron Job para Dona Nice App
# Este script chama o endpoint de verificação de pagamentos pendentes

# Configurações
API_URL="http://localhost:3001/api/cron/check-due-payments"
LOG_FILE="/var/log/dona-nice-cron.log"

# Função de log
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Executar verificação
log "Iniciando verificação de pagamentos pendentes"

# Fazer requisição POST para o endpoint
response=$(curl -s -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{}' \
    $API_URL)

# Verificar resposta
http_code="${response: -3}"

if [ "$http_code" = "200" ]; then
    log "Verificação concluída com sucesso"
elif [ "$http_code" = "500" ]; then
    log "Erro interno do servidor durante verificação"
else
    log "Erro inesperado. HTTP Code: $http_code"
fi

log "Verificação finalizada"
echo "---" >> $LOG_FILE
