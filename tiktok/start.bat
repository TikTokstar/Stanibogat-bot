@echo off
setlocal
cd /d "%~dp0"

echo.
echo  ====================================
echo   TikTok LIVE bridge
echo  ====================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js is required.
  echo  Download it from https://nodejs.org  ^(the LTS button^)
  echo  then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo  First run - installing, this takes a minute...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  Install FAILED. Check your internet connection.
    pause
    exit /b 1
  )
)

echo.
node server.js %*
pause
