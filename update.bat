@echo off
setlocal
cd /d "%~dp0"

set "REPO=https://github.com/TikTokstar/Stanibogat-bot"
set "BRANCH=claude/bulgarian-quiz-game-xu0iy1"

echo.
echo  ====================================
echo   "Znaesh li?"  -  update
echo  ====================================
echo.

rem --- if this is a git clone, just pull ---
where git >nul 2>nul || goto zipmode
if not exist ".git" goto zipmode
echo  Updating with git...
git pull
if errorlevel 1 goto failed
goto done

rem --- otherwise download the latest zip and overwrite the files ---
:zipmode
echo  Downloading the latest version...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$tmp = Join-Path $env:TEMP 'znaeshli-update';" ^
  "if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }" ^
  "New-Item -ItemType Directory -Path $tmp | Out-Null;" ^
  "$zip = Join-Path $tmp 'src.zip';" ^
  "Invoke-WebRequest -Uri '%REPO%/archive/refs/heads/%BRANCH%.zip' -OutFile $zip;" ^
  "Expand-Archive -Path $zip -DestinationPath $tmp -Force;" ^
  "$src = Get-ChildItem $tmp -Directory ^| Select-Object -First 1;" ^
  "Copy-Item -Path (Join-Path $src.FullName '*') -Destination '%CD%' -Recurse -Force;" ^
  "Remove-Item $tmp -Recurse -Force"
if errorlevel 1 goto failed

:done
echo.
echo  OK! Everything is up to date.
echo  Open index.html to play.
echo.
pause
exit /b 0

:failed
echo.
echo  Update FAILED.
echo  Check your internet connection and try again.
echo.
pause
exit /b 1
