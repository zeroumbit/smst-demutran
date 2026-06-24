@echo off
REM Script de sincronização com o GitHub para Windows
REM Para executar: github_sync.bat

echo 🚀 Iniciando sincronização com o GitHub...

REM Verifica se o git está instalado
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ git não encontrado. Por favor, instale o git primeiro.
    pause
    exit /b 1
)

REM Verifica se já está em um repositório git
if exist ".git" (
    echo ✅ Repositório git já existe
) else (
    echo 📁 Inicializando novo repositório git...
    git init
)

echo 🔄 Adicionando arquivos para commit...
git add .

echo 📝 Fazendo commit dos arquivos...
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

echo 🔗 Conectando ao repositório remoto...
git remote add origin https://github.com/zeroumbit/site-smst.git >nul 2>&1 || git remote set-url origin https://github.com/zeroumbit/site-smst.git

echo 📡 Enviando alterações para o GitHub...
git branch -M main
git push -u origin main --force

if %errorlevel% equ 0 (
    echo 🎉 Repositório sincronizado com sucesso!
    echo 🔗 Acesse: https://github.com/zeroumbit/site-smst
) else (
    echo ❌ Erro ao enviar para o GitHub
    echo 💡 Certifique-se de que você tem permissões de escrita no repositório
)

pause