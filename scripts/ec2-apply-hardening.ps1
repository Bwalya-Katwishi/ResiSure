# Upload hardening scripts and run on EC2 from Windows.
#
# Usage:
#   .\scripts\ec2-apply-hardening.ps1 -ServerIp 15.134.236.93
#   .\scripts\ec2-apply-hardening.ps1 -ServerIp 15.134.236.93 -Domain resisure.zm -Email admin@resisure.zm

param(
  [Parameter(Mandatory = $true)]
  [string]$ServerIp,

  [string]$Domain = "",

  [string]$Email = "",

  [string]$KeyPath = "$env:USERPROFILE\.ssh\resisure-productiom-key.pem",

  [string]$RemoteUser = "ec2-user",

  [string]$SecretsFile = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "Uploading hardening scripts..."
Push-Location $Root
$scripts = @(
  "scripts/ec2-backup-db.sh",
  "scripts/ec2-install-backup-cron.sh",
  "scripts/ec2-setup-https.sh",
  "scripts/ec2-production-check.sh",
  "scripts/ec2-harden-production.sh",
  "apps/api/.env.production.secrets.example"
)
foreach ($f in $scripts) {
  if (Test-Path $f) {
    scp -i $KeyPath -o StrictHostKeyChecking=no $f "${RemoteUser}@${ServerIp}:~/resisure/$f"
  }
}
Pop-Location

if ($SecretsFile -and (Test-Path $SecretsFile)) {
  Write-Host "Uploading secrets file..."
  scp -i $KeyPath -o StrictHostKeyChecking=no $SecretsFile "${RemoteUser}@${ServerIp}:~/resisure-secrets.env"
}

$domainArgs = ""
if ($Domain -and $Email) {
  $domainArgs = "--domain $Domain --email $Email"
}

Write-Host "Running hardening on server..."
$remoteCmd = "cd ~/resisure && sed -i 's/\r$//' scripts/ec2-*.sh && chmod +x scripts/ec2-*.sh && bash scripts/ec2-harden-production.sh $domainArgs"
ssh -i $KeyPath -o StrictHostKeyChecking=no "${RemoteUser}@${ServerIp}" $remoteCmd

Write-Host "Done. Check output above for warnings."
