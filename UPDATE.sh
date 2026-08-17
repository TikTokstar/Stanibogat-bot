#!/usr/bin/env bash
# Обновява играта до последната версия — за macOS и Linux.
# Пускане:  ./update.sh      (първия път: chmod +x update.sh)
set -euo pipefail
cd "$(dirname "$0")"

REPO="https://github.com/TikTokstar/Stanibogat-bot"
BRANCH="claude/bulgarian-quiz-game-xu0iy1"

echo
echo "  ===================================="
echo '   "Знаеш ли?"  —  обновяване'
echo "  ===================================="
echo

if command -v git >/dev/null 2>&1 && [ -d .git ]; then
  echo "  Обновяване през git…"
  git pull
else
  echo "  Сваляне на последната версия…"
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  curl -fsSL "$REPO/archive/refs/heads/$BRANCH.zip" -o "$tmp/src.zip"

  if command -v unzip >/dev/null 2>&1; then
    unzip -q -o "$tmp/src.zip" -d "$tmp"
  else
    echo "  Липсва 'unzip'. Инсталирай го и опитай пак." >&2
    exit 1
  fi

  src="$(find "$tmp" -mindepth 1 -maxdepth 1 -type d | head -1)"
  [ -n "$src" ] || { echo "  Архивът е празен." >&2; exit 1; }
  cp -R "$src/." .
fi

touch server/.needs-install 2>/dev/null || true

echo
echo "  Готово! Пусни ./START.sh както обикновено."
echo
