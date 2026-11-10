@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 22.13 or later, then run this launcher again.
  pause
  exit /b 1
)
if not exist "node_modules\qrcode\package.json" (
  call npm ci --no-audit --no-fund
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm start
if errorlevel 1 pause

