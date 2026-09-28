@echo off
setlocal
cd /d "%~dp0"
set DISABLE_HMR=true
set E2EE_MODE=strict
set VITE_CLOUD_SECURITY_MODE=strict
echo Starting FinanzasFamiliares dev server on http://localhost:3000 ...
call npm run dev
endlocal
