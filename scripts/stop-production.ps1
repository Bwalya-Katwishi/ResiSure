$ErrorActionPreference = 'SilentlyContinue'
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -match 'ResiSure Project\\apps\\(api|web)' -and $_.CommandLine -match 'server\.js|next start' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Write-Host 'Stopped ResiSure API and web processes (if they were running).'
