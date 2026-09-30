$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host 'Checking required local configuration...'
if (-not (Test-Path 'apps/api/.env')) {
  throw 'Missing apps/api/.env. Copy apps/api/.env.example and set the database and JWT values.'
}
if (-not (Test-Path 'apps/web/.env.local')) {
  Copy-Item 'apps/web/.env.local.example' 'apps/web/.env.local'
}

Write-Host 'Installing Node.js dependencies...'
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }

Write-Host 'Checking PostgreSQL and applying migrations...'
npm run migrate
if ($LASTEXITCODE -ne 0) {
  throw 'Database migration failed. Ensure the PostgreSQL Windows service is running and apps/api/.env is correct.'
}

Write-Host 'Building the Next.js production application...'
npm run build:web
if ($LASTEXITCODE -ne 0) { throw 'Next.js production build failed.' }

Write-Host ''
Write-Host 'Production setup completed.'
Write-Host 'Run: npm run production:start'
