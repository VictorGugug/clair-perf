#Requires -Version 5.1

$ErrorActionPreference = "Stop"
$Name = "clair-perf.js"
$file = Join-Path $env:APPDATA "spicetify\Extensions\$Name"

if (-not (Get-Command spicetify -ErrorAction SilentlyContinue)) {
  Write-Host "Spicetify is not installed." -ForegroundColor Yellow
  exit 1
}

if ((spicetify config extensions | Out-String).Trim() -match '(^|\|)clair-perf\.js(\||$)') {
  spicetify config extensions "$Name-" | Out-Null
}

if (Test-Path $file) {
  Remove-Item -Force -LiteralPath $file
}

spicetify apply

Write-Host "Clair Perf removed." -ForegroundColor Cyan
