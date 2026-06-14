# ─────────────────────────────────────────────────────────────────────────
# DISPATCH.AI installer (Windows / PowerShell)
#
#   irm https://raw.githubusercontent.com/h1kv/dispatch-tooling/main/scripts/install.ps1 | iex
#
# Clones the repo (if needed), installs dependencies, and scaffolds config.
# Safe to re-run. Requires git and Node.js >= 20.
# ─────────────────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"

$Repo = "https://github.com/h1kv/dispatch-tooling.git"
$Dir  = if ($env:DISPATCH_DIR) { $env:DISPATCH_DIR } else { "dispatch-tooling" }

function Ok($m)   { Write-Host "  [ok] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  [!]  $m" -ForegroundColor Yellow }
function Die($m)  { Write-Host "  [x]  $m" -ForegroundColor Red; exit 1 }

Write-Host "DISPATCH.AI installer" -ForegroundColor White

if (-not (Get-Command git  -ErrorAction SilentlyContinue)) { Die "git is required" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Die "Node.js >= 20 is required (https://nodejs.org)" }
$nodeMajor = [int]((node -v) -replace 'v(\d+).*','$1')
if ($nodeMajor -lt 20) { Die "Node.js >= 20 required (found $(node -v))" }
Ok "git and Node.js $(node -v)"

$inRepo = (Test-Path "package.json") -and (Select-String -Path "package.json" -Pattern '"name": "canview"' -Quiet)
if ($inRepo) {
  Ok "using current checkout"
} else {
  if (Test-Path "$Dir/.git") {
    Ok "repo already cloned -> updating"
    git -C $Dir pull --ff-only 2>$null
  } else {
    Write-Host "Cloning into $Dir" -ForegroundColor White
    git clone --depth 1 $Repo $Dir
    Ok "cloned"
  }
  Set-Location $Dir
}

Write-Host "Installing dependencies" -ForegroundColor White
npm install
Ok "dependencies installed"

node bin/dispatch.mjs init

Write-Host "`nDone" -ForegroundColor White
Write-Host @"

  Next steps:
    cd $Dir
    # add a provider key to .env (OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_API_KEY)
    node bin/dispatch.mjs doctor
    node bin/dispatch.mjs start

  Then open http://localhost:3000
"@
