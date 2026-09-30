# One-shot: upload project + run server deploy from YOUR Windows PC.
# Amazon Linux 2023 uses ec2-user (not ubuntu).
#
# Usage (PowerShell from project root):
#   cd "C:\Users\bwaly\Desktop\ResiSure Project"
#   .\scripts\ec2-finish-deploy.ps1 -ServerIp 52.63.118.181 -DbPassword "YOUR_POSTGRES_PASSWORD"

param(
  [Parameter(Mandatory = $true)]
  [string]$ServerIp,

  [Parameter(Mandatory = $true)]
  [string]$DbPassword,

  [string]$KeyPath = "$env:USERPROFILE\.ssh\resisure-productiom-key.pem",

  [string]$RemoteUser = "ec2-user"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path $KeyPath)) {
  throw "Key not found: $KeyPath"
}

Write-Host "Testing SSH to ${RemoteUser}@${ServerIp}..."
ssh -i $KeyPath -o StrictHostKeyChecking=no -o ConnectTimeout=20 "${RemoteUser}@${ServerIp}" "echo SSH OK"
if ($LASTEXITCODE -ne 0) {
  throw @"
SSH failed. In AWS Console -> EC2 -> Security Groups -> Inbound rules:
  SSH (22) must allow YOUR current IP (use 'My IP').
Then retry this script.
"@
}

Write-Host "Uploading project (streaming tar, may take a few minutes)..."
Push-Location $Root
ssh -i $KeyPath -o StrictHostKeyChecking=no "${RemoteUser}@${ServerIp}" "mkdir -p ~/resisure"
cmd /c "tar -czf - --exclude=node_modules --exclude=.git --exclude=apps/api/uploads --exclude=apps/api/.env --exclude=apps/web/.env.local . | ssh -i `"$KeyPath`" -o StrictHostKeyChecking=no ${RemoteUser}@${ServerIp} `"tar -xzf - -C ~/resisure`""
Pop-Location
if ($LASTEXITCODE -ne 0) { throw "Upload failed." }

Write-Host "Running deploy on server..."
$escapedDb = $DbPassword.Replace("'", "'\\''")
ssh -i $KeyPath -o StrictHostKeyChecking=no "${RemoteUser}@${ServerIp}" "cd ~/resisure && bash scripts/ec2-deploy.sh $ServerIp '$escapedDb'"

Write-Host ""
Write-Host "Done! Open: http://$ServerIp"
Write-Host "Health:  http://$ServerIp/health"
