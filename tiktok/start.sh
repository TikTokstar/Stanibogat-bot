#!/usr/bin/env bash
# Пуска моста към TikTok LIVE — за macOS и Linux.
# Пускане:  ./start.sh          (първия път: chmod +x start.sh)
#           ./start.sh @име     (свързва се веднага към този профил)
set -euo pipefail
cd "$(dirname "$0")"

echo
echo "  ===================================="
echo "   Мост към TikTok LIVE"
echo "  ===================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "  Нужен е Node.js — свали го от https://nodejs.org и пусни отново."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "  Първо пускане — инсталиране, отнема минута…"
  echo
  npm install
fi

echo
exec node server.js "$@"
