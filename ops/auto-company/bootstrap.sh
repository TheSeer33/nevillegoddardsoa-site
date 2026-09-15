#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OPS="$ROOT/ops/auto-company"
RUNTIME="$ROOT/.auto-company-runtime"
UPSTREAM="https://github.com/MaxMiksa/Auto-Company.git"

command -v git >/dev/null || { echo "git is required"; exit 1; }
command -v make >/dev/null || { echo "make is required"; exit 1; }

if ! command -v codex >/dev/null && ! command -v claude >/dev/null; then
  echo "Install and authenticate either Codex CLI or Claude Code before starting."
  exit 2
fi

sync_config() {
  mkdir -p "$RUNTIME/memories"
  cp "$OPS/PROMPT.md" "$RUNTIME/PROMPT.md"
  cp "$OPS/consensus.md" "$RUNTIME/memories/consensus.md"
  if [ -f "$RUNTIME/CLAUDE.md" ]; then
    cp "$RUNTIME/CLAUDE.md" "$RUNTIME/CLAUDE.upstream.md"
  fi
  {
    [ -f "$RUNTIME/CLAUDE.upstream.md" ] && cat "$RUNTIME/CLAUDE.upstream.md"
    printf "\n\n# Portfolio Company Override\n"
    cat "$OPS/CHARTER.md"
    printf "\n\n# Working Repository\n"
    printf "The operating target is the parent repository at: %s\n" "$ROOT"
    printf "Do not create a disconnected replacement product inside the runtime directory. Make verified changes against the operating target when code changes are required.\n"
  } > "$RUNTIME/CLAUDE.md"
}

if [ ! -d "$RUNTIME/.git" ]; then
  git clone "$UPSTREAM" "$RUNTIME"
else
  git -C "$RUNTIME" fetch origin
  git -C "$RUNTIME" pull --ff-only origin main || true
fi

sync_config

case "${1:-start}" in
  start)
    echo "Starting autonomous company runtime for: $ROOT"
    cd "$RUNTIME"
    make start
    ;;
  install)
    echo "Installing background daemon for: $ROOT"
    cd "$RUNTIME"
    make install
    ;;
  monitor)
    cd "$RUNTIME"
    make monitor
    ;;
  stop)
    cd "$RUNTIME"
    make stop
    ;;
  sync)
    echo "Configuration synchronized."
    ;;
  *)
    echo "Usage: $0 {start|install|monitor|stop|sync}"
    exit 64
    ;;
esac
