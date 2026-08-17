#!/usr/bin/env bash
# Пуска играта заедно с TikTok гласуването — за macOS и Linux.
# Пускане:  ./START.sh          (първия път: chmod +x START.sh)
#           ./START.sh @име     (свързва се веднага към този профил)
set -euo pipefail
cd "$(dirname "$0")/server"

echo
echo "  =========================================="
echo "    ЗНАЕШ ЛИ?  —  стартиране…"
echo "  =========================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "  Нужен е Node.js — свали го от https://nodejs.org и пусни отново."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "  Първо пускане — инсталиране, отнема около минута…"
  echo
  npm install --no-audit --no-fund
  echo
fi

# отваряме браузъра, след като сървърът е вдигнат
URL="http://localhost:${PORT:-8080}"
( sleep 2
  if   command -v open     >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  fi ) >/dev/null 2>&1 &

exec node server.js "$@"
