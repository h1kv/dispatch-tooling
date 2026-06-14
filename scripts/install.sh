#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# DISPATCH.AI installer
#
#   curl -fsSL https://raw.githubusercontent.com/h1kv/dispatch-tooling/main/scripts/install.sh | bash
#
# Clones the repo (if needed), installs dependencies, and scaffolds config.
# Safe to re-run. Requires git and Node.js >= 20.
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO="https://github.com/h1kv/dispatch-tooling.git"
DIR="${DISPATCH_DIR:-dispatch-tooling}"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "  \033[33m!\033[0m %s\n" "$1"; }
die()  { printf "  \033[31m✖ %s\033[0m\n" "$1" >&2; exit 1; }

bold "DISPATCH.AI installer"

# 1. Prerequisites
command -v git  >/dev/null 2>&1 || die "git is required"
command -v node >/dev/null 2>&1 || die "Node.js >= 20 is required (https://nodejs.org)"
NODE_MAJOR="$(node -v | sed 's/v\([0-9]*\).*/\1/')"
[ "$NODE_MAJOR" -ge 20 ] || die "Node.js >= 20 required (found $(node -v))"
ok "git and Node.js $(node -v)"

# 2. Get the source (clone, or use the current checkout)
if [ -f "package.json" ] && grep -q '"name": "canview"' package.json 2>/dev/null; then
  ok "using current checkout"
else
  if [ -d "$DIR/.git" ]; then
    ok "repo already cloned → updating"
    git -C "$DIR" pull --ff-only || warn "could not fast-forward; continuing"
  else
    bold "Cloning into $DIR"
    git clone --depth 1 "$REPO" "$DIR"
    ok "cloned"
  fi
  cd "$DIR"
fi

# 3. Install dependencies
bold "Installing dependencies"
npm install
ok "dependencies installed"

# 4. Scaffold config + workspace dirs (via the CLI)
node bin/dispatch.mjs init

# 5. Done
bold "Done"
cat <<EOF

  Next steps:
    cd ${DIR}
    # add a provider key to .env (OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_API_KEY)
    node bin/dispatch.mjs doctor
    node bin/dispatch.mjs start

  Then open http://localhost:3000

EOF
