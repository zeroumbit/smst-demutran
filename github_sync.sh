#!/bin/bash
# Script de sincronização com o GitHub
# Para executar: ./github_sync.sh

echo "🚀 Iniciando sincronização com o GitHub..."

# Verifica se o git está instalado
if ! command -v git &> /dev/null; then
    echo "❌ git não encontrado. Por favor, instale o git primeiro."
    exit 1
fi

# Verifica se já está em um repositório git
if [ -d ".git" ]; then
    echo "✅ Repositório git já existe"
else
    echo "📁 Inicializando novo repositório git..."
    git init
fi

echo "🔄 Adicionando arquivos para commit..."
git add .

echo " committing os arquivos..."
git config user.name "Automated Sync"
git config user.email "auto-sync@noreply.com"
git commit -m " feat: adiciona módulo de documentos e scripts de integração com Supabase

- Cria componente de gerenciamento de documentos no painel admin
- Adiciona funcionalidades CRUD para documentos (PDF/Word)
- Implementa upload e armazenamento de documentos no Supabase Storage
- Cria scripts de integração automática com o Supabase
- Atualiza menu admin para incluir módulo de documentos
- Adiciona estatísticas e dashboard para documentos
- Corrige exibição da logo no login do admin
- Remove funcionalidade de projetos do admin (mantendo nas páginas públicas)
- Implementa regras para seção de últimas notícias na home
- Adiciona informações sobre atuação da defesa civil no combate à seca"

echo "🔗 Conectando ao repositório remoto..."
git remote add origin https://github.com/zeroumbit/site-smst.git || git remote set-url origin https://github.com/zeroumbit/site-smst.git

echo "📡 Enviando alterações para o GitHub..."
git branch -M main
git push -u origin main --force

if [ $? -eq 0 ]; then
    echo "🎉 Repositório sincronizado com sucesso!"
    echo "🔗 Acesse: https://github.com/zeroumbit/site-smst"
else
    echo "❌ Erro ao enviar para o GitHub"
    echo "💡 Certifique-se de que você tem permissões de escrita no repositório"
fi