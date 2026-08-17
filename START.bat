@echo off
setlocal
cd /d "%~dp0server"

echo.
echo  ==========================================
echo    ZNAESH LI?  -  starting...
echo  ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js is required - this runs the game server.
  echo.
  echo  1. Open https://nodejs.org
  echo  2. Click the big LTS button and install it
  echo  3. Run this file again
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo  First run - installing. Takes about a minute...
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo  Install FAILED. Check your internet connection.
    pause
    exit /b 1
  )
  echo.
)

if "%PORT%"=="" set "PORT=8080"

rem browser opens after a short delay so the server is already up
start "" /b cmd /c "timeout /t 2 >nul & start http://localhost:%PORT%"

node server.js %*
echo.
echo  Server stopped.
pause
