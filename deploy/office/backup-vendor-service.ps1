<#
  Consistent backup of the office vendor service: database dump + pending documents + config.
  Run from the office host (Task Scheduler, daily, as the service account). Stop nothing.
  The approved archive (\Server\...\الموردون المعتمدون) is backed up separately by the office.
  Usage: powershell -File backup-vendor-service.ps1 -Root D:\MSP-VendorService -Dest \Server\Backups\msp-vendor-service
#>
param([string]$Root = 'D:\MSP-VendorService', [string]$Dest = 'D:\MSP-VendorService\backups', [int]$KeepDays = 30)
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$out = Join-Path $Dest $stamp
New-Item -ItemType Directory -Force $out | Out-Null
# 1) Database — pg_dump takes a consistent snapshot without stopping the service (PGPASSWORD from the environment or %APPDATA%\postgresql\pgpass.conf)
& "$env:ProgramFiles\PostgreSQL\16\bin\pg_dump.exe" -h localhost -U msp_vendor -d msp_vendor -F c -f (Join-Path $out 'msp_vendor.dump')
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed" }
# 2) Pending documents (content-addressed; files never change once written, so a plain copy is consistent)
robocopy (Join-Path $Root 'documents') (Join-Path $out 'documents') /E /R:2 /W:5 /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE)" }
# 3) Config (no secrets: .env is intentionally NOT copied — keep it in the password manager)
Copy-Item (Join-Path $Root 'ArchiveAgent\config.json') $out -ErrorAction SilentlyContinue
# 4) Retention
Get-ChildItem $Dest -Directory | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } | Remove-Item -Recurse -Force
Write-Host "backup written to $out"
# RESTORE: createdb msp_vendor; pg_restore -h localhost -U msp_vendor -d msp_vendor msp_vendor.dump ; robocopy documents\ D:\MSP-VendorService\documents /E
