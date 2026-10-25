#Requires -Version 5.1

$ErrorActionPreference = "Stop"
$Name = "clair-perf.js"
$Source = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) $Name
$dest = Join-Path $env:APPDATA "spicetify\Extensions"

if (-not (Get-Command spicetify -ErrorAction SilentlyContinue)) {
  Write-Host "Spicetify is not installed. See https://spicetify.app/docs/getting-started" -ForegroundColor Yellow
  exit 1
}

New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item -LiteralPath $Source -Destination (Join-Path $dest $Name) -Force

if ((spicetify config extensions | Out-String).Trim() -notmatch '(^|\|)clair-perf\.js(\||$)') {
  spicetify config extensions $Name | Out-Null
}

spicetify apply

Write-Host "Clair Perf installed. Open Clair settings, Experiments tab." -ForegroundColor Cyan
