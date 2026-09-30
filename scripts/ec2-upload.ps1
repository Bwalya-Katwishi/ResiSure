# Upload ResiSure to EC2 from Windows (no GitHub required).
# Amazon Linux 2023: ec2-user. Ubuntu: ubuntu.
#
# Usage (PowerShell):
#   .\scripts\ec2-upload.ps1 -ServerIp 52.63.118.181

param(
  [Parameter(Mandatory = $true)]
  [string]$ServerIp,

  [string]$KeyPath = "$env:USERPROFILE\.ssh\resisure-productiom-key.pem",

  [string]$RemoteUser = "ec2-user",

  [string]$RemotePath = "/home/ec2-user/resisure"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Archive = Join-Path $env:TEMP "resisure-deploy.tgz"

Write-Host "Creating archive (excluding node_modules and .git)..."
if (Test-Path $Archive) { Remove-Item $Archive -Force }
Push-Location $Root
tar -czf $Archive --exclude=node_modules --exclude=.git --exclude=apps/api/uploads --exclude=apps/api/.env --exclude=apps/web/.env.local .
Pop-Location

Write-Host "Testing SSH..."
ssh -i $KeyPath -o StrictHostKeyChecking=no -o ConnectTimeout=20 "${RemoteUser}@${ServerIp}" "echo SSH OK"
if ($LASTEXITCODE -ne 0) { throw "SSH failed. Check security group allows SSH from your IP." }

Write-Host "Uploading to ubuntu@${ServerIp}:${RemotePath} ..."
ssh -i $KeyPath -o StrictHostKeyChecking=no "${RemoteUser}@${ServerIp}" "mkdir -p $RemotePath"
scp -i $KeyPath -o StrictHostKeyChecking=no $Archive "${RemoteUser}@${ServerIp}:~/resisure-deploy.tgz"
if ($LASTEXITCODE -ne 0) { throw "SCP upload failed." }

Write-Host "Extracting on server..."
ssh -i $KeyPath -o StrictHostKeyChecking=no "${RemoteUser}@${ServerIp}" "mkdir -p $RemotePath && tar -xzf ~/resisure-deploy.tgz -C $RemotePath && rm -f ~/resisure-deploy.tgz && echo Upload complete."
if ($LASTEXITCODE -ne 0) { throw "Extract on server failed." }

Write-Host "Done. Run deploy on the server next:"
Write-Host "  ssh -i $KeyPath ${RemoteUser}@${ServerIp}"
Write-Host "  cd ~/resisure && bash scripts/ec2-deploy.sh $ServerIp"
