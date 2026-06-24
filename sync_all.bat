@echo off
REM Script de Sincronização Completa - Windows Batch
REM Sincroniza aplicação local com Supabase Cloud e GitHub

echo.
echo ================================================================
echo    SINCRONIZACAO AUTOMATICA COMPLETA
echo ================================================================
echo.

REM Configurações
set GITHUB_REPO=https://github.com/zeroumbit/smst-demutran
set PROJECT_ID=jpztntmwmrhdobxsyulj

REM Verificar se está no diretório correto
if not exist package.json (
    echo [ERRO] Este script deve ser executado na raiz do projeto!
    exit /b 1
)

REM Passo 1: Sincronizar com Supabase Cloud
echo [1] Sincronizando com Supabase Cloud...
call node auto_cloud_sync.js
if %errorlevel% equ 0 (
    echo [OK] Sincronizacao com Supabase concluida
) else (
    echo [AVISO] Sincronizacao com Supabase teve avisos
)
echo.

REM Passo 2: Verificar status do Git
echo [2] Verificando status do Git...
git status --porcelain > nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Git disponivel
    
    REM Passo 3: Adicionar arquivos
    echo [3] Adicionando arquivos ao Git...
    git add .
    echo [OK] Arquivos adicionados
    echo.
    
    REM Passo 4: Commit
    echo [4] Criando commit...
    for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
    for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a:%%b)
    git commit -m "Sincronizacao automatica - %mydate% %mytime%"
    echo [OK] Commit criado
    echo.
    
    REM Passo 5: Push para GitHub
    echo [5] Enviando para GitHub...
    git push origin main
    if %errorlevel% equ 0 (
        echo [OK] Push para GitHub concluido
    ) else (
        echo [AVISO] Tentando push para branch master...
        git push origin master
        if %errorlevel% equ 0 (
            echo [OK] Push para GitHub concluido (master)
        ) else (
            echo [ERRO] Erro ao fazer push para GitHub
        )
    )
) else (
    echo [AVISO] Git nao disponivel ou sem alteracoes
)
echo.

REM Passo 6: Exibir informações do projeto
echo [6] Informacoes do Projeto
echo.
echo GitHub: %GITHUB_REPO%
echo Supabase Project ID: %PROJECT_ID%
echo Supabase Dashboard: https://supabase.com/dashboard/project/%PROJECT_ID%
echo.

REM Resumo final
echo ================================================================
echo    SINCRONIZACAO COMPLETA FINALIZADA!
echo ================================================================
echo.
echo Proximos passos:
echo 1. Execute 'npm run dev' para iniciar o servidor
echo 2. Acesse o Supabase Dashboard para gerenciar o banco de dados
echo 3. Verifique o repositorio GitHub para confirmar as alteracoes
echo.

pause
