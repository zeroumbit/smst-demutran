@echo off
REM Script de instalação das dependências do projeto para Windows

echo Iniciando instalação das dependências...

REM Verifica se o npm está instalado
npm --version >nul 2>&1
if errorlevel 1 (
    echo npm não encontrado. Por favor, instale o Node.js primeiro.
    exit /b 1
)

REM Instala as dependências
echo Instalando dependências do projeto...
npm install

echo Instalação concluída!

echo Para executar a integração com o Supabase e criar a tabela documentos, execute:
echo npm run setup-supabase

pause