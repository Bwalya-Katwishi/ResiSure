$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Test-Path 'apps/web/.next/BUILD_ID')) {
  throw 'Production build not found. Run npm run production:setup first.'
}

$apiCmd = "Set-Location '$Root\apps\api'; `$env:NODE_ENV='production'; node src/server.js"
$webCmd = "Set-Location '$Root\apps\web'; `$env:NODE_ENV='production'; `$env:PORT='3000'; node '$Root\node_modules\next\dist\bin\next' start -p 3000"

Start-Process powershell -ArgumentList '-NoExit', '-Command', $apiCmd -WindowStyle Minimized
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList '-NoExit', '-Command', $webCmd -WindowStyle Minimized

Write-Host ''
Write-Host 'ResiSure started in separate PowerShell windows:'
Write-Host '  Web: http://localhost:3000'
Write-Host '  API: http://localhost:5000'
Write-Host '  Readiness: http://localhost:5000/ready'
Write-Host ''
Write-Host 'Close those windows to stop the services.'
