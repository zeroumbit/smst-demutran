#!/bin/bash
# Script de instalação das dependências do projeto

echo "Iniciando instalação das dependências..."

# Verifica se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "npm não encontrado. Por favor, instale o Node.js primeiro."
    exit 1
fi

# Instala as dependências
echo "Instalando dependências do projeto..."
npm install

echo "Instalação concluída!"

echo "Para executar a integração com o Supabase e criar a tabela documentos, execute:"
echo "npm run setup-supabase"