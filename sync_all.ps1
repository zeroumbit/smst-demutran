# Script de Sincronização Completa
# Sincroniza aplicação local com Supabase Cloud e GitHub

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   SINCRONIZAÇÃO AUTOMÁTICA COMPLETA                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Configurações
$GITHUB_REPO = "https://github.com/zeroumbit/smst-demutran"
$PROJECT_ID = "jpztntmwmrhdobxsyulj"

# Função para exibir mensagens
function Write-Step {
    param($Step, $Message)
    Write-Host "`n[$Step] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param($Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param($Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning {
    param($Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

# Verificar se está no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Error "Este script deve ser executado na raiz do projeto!"
    exit 1
}

# Passo 1: Sincronizar com Supabase Cloud
Write-Step "1" "Sincronizando com Supabase Cloud"
try {
    node auto_cloud_sync.js
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Sincronização com Supabase concluída"
    } else {
        Write-Warning "Sincronização com Supabase teve avisos"
    }
} catch {
    Write-Error "Erro ao sincronizar com Supabase: $_"
}

# Passo 2: Verificar status do Git
Write-Step "2" "Verificando status do Git"
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Success "Alterações detectadas no Git"
    
    # Passo 3: Adicionar arquivos
    Write-Step "3" "Adicionando arquivos ao Git"
    git add .
    Write-Success "Arquivos adicionados"
    
    # Passo 4: Commit
    Write-Step "4" "Criando commit"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Sincronização automática - $timestamp"
    Write-Success "Commit criado"
    
    # Passo 5: Push para GitHub
    Write-Step "5" "Enviando para GitHub"
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Push para GitHub concluído"
    } else {
        Write-Warning "Tentando push para branch master..."
        git push origin master
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Push para GitHub concluído (master)"
        } else {
            Write-Error "Erro ao fazer push para GitHub"
        }
    }
} else {
    Write-Success "Nenhuma alteração para commitar"
}

# Passo 6: Exibir informações do projeto
Write-Step "6" "Informações do Projeto"
Write-Host ""
Write-Host "GitHub: $GITHUB_REPO" -ForegroundColor Blue
Write-Host "Supabase Project ID: $PROJECT_ID" -ForegroundColor Blue
Write-Host "Supabase Dashboard: https://supabase.com/dashboard/project/$PROJECT_ID" -ForegroundColor Blue
Write-Host ""

# Resumo final
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✓ SINCRONIZAÇÃO COMPLETA FINALIZADA!                     ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Execute 'npm run dev' para iniciar o servidor" -ForegroundColor White
Write-Host "2. Acesse o Supabase Dashboard para gerenciar o banco de dados" -ForegroundColor White
Write-Host "3. Verifique o repositório GitHub para confirmar as alterações" -ForegroundColor White
Write-Host ""
