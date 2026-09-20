<#
  MSP — Read-only security & capacity audit for \\SERVER (Windows Server / Domain Controller)
  ------------------------------------------------------------------------------------------
  HOW TO RUN (on SERVER itself, as Administrator):
      Right-click PowerShell -> "Run as administrator", then:
      Set-ExecutionPolicy -Scope Process Bypass -Force
      & "\\<your-pc>\...\Audit-SERVER-ReadOnly.ps1"      (or copy the file locally first)

  OUTPUT: a single text file on the Desktop:  SERVER-Audit-<date>.txt
  SAFETY: this script only READS. It changes nothing, installs nothing, stops nothing.
          Secrets are never printed. IPs are masked to the first two octets.
#>

$ErrorActionPreference = 'SilentlyContinue'
$out = Join-Path ([Environment]::GetFolderPath('Desktop')) ("SERVER-Audit-{0}.txt" -f (Get-Date -Format 'yyyy-MM-dd_HHmm'))
$sb  = New-Object System.Text.StringBuilder

function W($s)        { [void]$sb.AppendLine($s) }
function H($t)        { W ""; W ("=" * 78); W "  $t"; W ("=" * 78) }
function T($obj)      { if ($obj) { W (($obj | Format-Table -AutoSize -Wrap | Out-String).TrimEnd()) } else { W "(none)" } }
function L($obj)      { if ($obj) { W (($obj | Format-List | Out-String).TrimEnd()) } else { W "(none)" } }
function MaskIP($ip)  { if ($ip -match '^(\d+)\.(\d+)\.\d+\.\d+$') { "$($Matches[1]).$($Matches[2]).x.x" } else { $ip } }
function Try2($label, [scriptblock]$b) { try { & $b } catch { W "$label : not readable ($($_.Exception.Message.Split([char]10)[0]))" } }

W "MSP SERVER AUDIT (read-only)  —  generated $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
W "Run as: $([Security.Principal.WindowsIdentity]::GetCurrent().Name -replace '^[^\\]+\\','***\')  | admin: $(([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole('Administrator'))"

# ---------------------------------------------------------------- A. Identity
H "A. SYSTEM IDENTITY"
Try2 "OS" {
  $os = Get-CimInstance Win32_OperatingSystem; $cs = Get-CimInstance Win32_ComputerSystem; $bios = Get-CimInstance Win32_BIOS
  L ([pscustomobject]@{
    OS = $os.Caption; Version = $os.Version; Build = $os.BuildNumber; InstallDate = $os.InstallDate; LastBoot = $os.LastBootUpTime
    UptimeDays = [math]::Round(((Get-Date) - $os.LastBootUpTime).TotalDays,1)
    Manufacturer = $cs.Manufacturer; Model = $cs.Model; IsVM = $cs.HypervisorPresent -or ($cs.Model -match 'Virtual|VMware|KVM|HVM')
    DomainRole = @('Standalone WS','Member WS','Standalone Server','Member Server','Backup DC','Primary DC')[$cs.DomainRole]
    Domain = $cs.Domain; BIOS = "$($bios.Manufacturer) $($bios.SMBIOSBIOSVersion)"
  })
}

# ---------------------------------------------------------------- B. Resources
H "B. RESOURCES"
Try2 "CPU" { T (Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, LoadPercentage) }
Try2 "RAM" { $os = Get-CimInstance Win32_OperatingSystem; W ("RAM total {0:N1} GB | free {1:N1} GB" -f ($os.TotalVisibleMemorySize/1MB), ($os.FreePhysicalMemory/1MB)) }
Try2 "Volumes" { T (Get-Volume | Where-Object DriveLetter | Select-Object DriveLetter, FileSystemLabel, FileSystem, @{n='Size_GB';e={[math]::Round($_.Size/1GB)}}, @{n='Free_GB';e={[math]::Round($_.SizeRemaining/1GB)}}, @{n='Free_%';e={[math]::Round(100*$_.SizeRemaining/$_.Size,1)}}, HealthStatus) }
Try2 "PhysicalDisks" { T (Get-PhysicalDisk | Select-Object FriendlyName, MediaType, BusType, @{n='Size_GB';e={[math]::Round($_.Size/1GB)}}, HealthStatus, OperationalStatus) }
Try2 "StoragePools/RAID" { T (Get-StoragePool | Where-Object { -not $_.IsPrimordial } | Select-Object FriendlyName, HealthStatus, OperationalStatus); T (Get-VirtualDisk | Select-Object FriendlyName, ResiliencySettingName, HealthStatus, @{n='Size_GB';e={[math]::Round($_.Size/1GB)}}) }
Try2 "SMART" { T (Get-PhysicalDisk | Get-StorageReliabilityCounter | Select-Object DeviceId, Temperature, ReadErrorsTotal, WriteErrorsTotal, Wear, PowerOnHours) }

# ---------------------------------------------------------------- C. Roles & software
H "C. INSTALLED ROLES / FEATURES"
Try2 "Features" { T (Get-WindowsFeature | Where-Object Installed | Select-Object Name, DisplayName) }
H "C2. WEB / DB / CONTAINER SOFTWARE"
foreach ($t in 'node','npm','php','psql','pg_ctl','mysql','docker','nginx','httpd','caddy','pm2','redis-server','git') {
  $c = Get-Command $t -ErrorAction SilentlyContinue
  W ("{0,-14} {1}" -f $t, $(if ($c) { "FOUND  $($c.Source)" } else { "not in PATH" }))
}
Try2 "InstalledPrograms" {
  $apps = @()
  foreach ($k in 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*') { $apps += Get-ItemProperty $k | Where-Object DisplayName }
  T ($apps | Where-Object { $_.DisplayName -match 'SQL|Postgre|MySQL|Maria|Docker|Node|PHP|Apache|nginx|IIS|Redis|Veeam|Backup|Acronis|Kaspersky|ESET|Symantec|Sophos|TeamViewer|AnyDesk|VNC|Plesk|cPanel|XAMPP|WAMP' } | Select-Object DisplayName, DisplayVersion, InstallDate | Sort-Object DisplayName -Unique)
}

# ---------------------------------------------------------------- D. Services & listening ports
H "D. SERVICES (running, non-Microsoft or infra-relevant)"
Try2 "Services" { T (Get-CimInstance Win32_Service | Where-Object { $_.State -eq 'Running' -and ($_.PathName -notmatch 'Windows\\(system32|SysWOW64)' -or $_.Name -match 'W3SVC|MSSQL|postgres|mysql|docker|TermService|WinRM|sshd|DNS|NTDS|Netlogon|DFSR|LanmanServer|W32Time') } | Select-Object Name, DisplayName, StartName, @{n='Path';e={ ($_.PathName -split '\.exe')[0] + '.exe' }}) }
H "D2. LISTENING TCP PORTS (local socket table only)"
Try2 "Ports" { T (Get-NetTCPConnection -State Listen | Sort-Object LocalPort -Unique | ForEach-Object { $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; [pscustomobject]@{ Port=$_.LocalPort; Bind=$(if ($_.LocalAddress -in '127.0.0.1','::1'){'LOCAL'}elseif($_.LocalAddress -in '0.0.0.0','::'){'ALL'}else{'SPECIFIC'}); Process=$p.ProcessName } } | Sort-Object Port) }

# ---------------------------------------------------------------- E. Network & firewall
H "E. NETWORK & FIREWALL"
Try2 "IPs" { Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object { W ("{0} /{1} on {2}" -f (MaskIP $_.IPAddress), $_.PrefixLength, $_.InterfaceAlias) } }
Try2 "Gateway/DNS" { $gw = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Select-Object -First 1).NextHop; W "default gateway: $(MaskIP $gw)"; W ("DNS servers: " + ((Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object ServerAddresses | ForEach-Object { $_.ServerAddresses | ForEach-Object { MaskIP $_ } }) -join ', ')) }
Try2 "NetProfile" { T (Get-NetConnectionProfile | Select-Object Name, NetworkCategory, IPv4Connectivity) }
Try2 "FirewallProfiles" { T (Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction, DefaultOutboundAction, LogAllowed, LogBlocked) }
Try2 "FirewallInboundAllow" {
  $rows = foreach ($r in (Get-NetFirewallRule -Direction Inbound -Enabled True -Action Allow)) {
    $pf = $r | Get-NetFirewallPortFilter; $af = $r | Get-NetFirewallAddressFilter
    if ($pf.LocalPort -ne 'Any' -or $r.DisplayName -match 'Remote|RDP|SMB|SQL|postgres|http|web') { [pscustomobject]@{ Rule=$r.DisplayName; Profile=$r.Profile; Proto=$pf.Protocol; Port=($pf.LocalPort -join ','); RemoteAddr=($af.RemoteAddress -join ',') } }
  }
  T ($rows | Sort-Object Port)
}
Try2 "RDP" { $rdp = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server'; $nla = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp'; W "RDP enabled: $($rdp.fDenyTSConnections -eq 0) | NLA required: $($nla.UserAuthentication -eq 1) | SecurityLayer: $($nla.SecurityLayer) | Port: $($nla.PortNumber)" }
Try2 "SMB" { $s = Get-SmbServerConfiguration; W "SMBv1 enabled: $($s.EnableSMB1Protocol) | SMBv2/3: $($s.EnableSMB2Protocol) | RequireSigning: $($s.RequireSecuritySignature) | EncryptData: $($s.EncryptData) | RejectUnencrypted: $($s.RejectUnencryptedAccess)"; $f = Get-WindowsOptionalFeature -Online -FeatureName SMB1Protocol; W "SMB1 feature state: $($f.State)" }
Try2 "WinRM/SSH" { W "WinRM service: $((Get-Service WinRM).Status) | OpenSSH sshd: $((Get-Service sshd -ErrorAction SilentlyContinue).Status)" }
Try2 "UPnP/PortForward hints" { W "NAT/UPnP device: $((Get-Service upnphost).Status) (informational only — check router for forwarded ports manually)" }

# ---------------------------------------------------------------- F. Shares & permissions
H "F. SHARES & PERMISSIONS"
Try2 "Shares" { T (Get-SmbShare | Where-Object { $_.Name -notmatch '\$$' } | Select-Object Name, Path, Description, FolderEnumerationMode, EncryptData) }
Try2 "ShareACL" { T (Get-SmbShare | Where-Object { $_.Name -notmatch '\$$' } | Get-SmbShareAccess | Select-Object Name, AccountName, AccessControlType, AccessRight) }
Try2 "NTFS top-level ACL" {
  foreach ($sh in (Get-SmbShare | Where-Object { $_.Name -notmatch '\$$' -and $_.Path })) {
    W "--- $($sh.Name)  ($($sh.Path))"
    $acl = Get-Acl $sh.Path
    W "  Owner: $($acl.Owner)"
    foreach ($a in $acl.Access) { W ("  {0,-40} {1,-6} {2}" -f $a.IdentityReference, $a.AccessControlType, $a.FileSystemRights) }
    $risky = $acl.Access | Where-Object { $_.IdentityReference -match 'Everyone|Authenticated Users|Domain Users|BUILTIN\\Users' -and $_.FileSystemRights -match 'FullControl|Modify|Write' }
    if ($risky) { W "  !! RISK: broad write access for $($risky.IdentityReference -join ', ')" }
  }
}
Try2 "Share sizes" { foreach ($sh in (Get-SmbShare | Where-Object { $_.Name -notmatch '\$$' -and $_.Path -and (Test-Path $_.Path) })) { $d = Get-PSDrive ($sh.Path.Substring(0,1)); W ("{0,-20} volume {1}: free {2:N0} GB of {3:N0} GB" -f $sh.Name, $sh.Path.Substring(0,1), ($d.Free/1GB), (($d.Used+$d.Free)/1GB)) } }

# ---------------------------------------------------------------- G. Accounts & AD hygiene
H "G. ACCOUNTS & ACTIVE DIRECTORY (read-only)"
Try2 "LocalAdmins" { T (Get-LocalGroupMember -Group 'Administrators' | Select-Object Name, ObjectClass, PrincipalSource) }
Try2 "AD" {
  Import-Module ActiveDirectory -ErrorAction Stop
  $d = Get-ADDomain; $f = Get-ADForest
  W "Domain: $($d.DNSRoot) | DomainMode: $($d.DomainMode) | ForestMode: $($f.ForestMode)"
  W "Domain Controllers: $(($d.ReplicaDirectoryServers + $d.ReadOnlyReplicaDirectoryServers) -join ', ')  (count: $($d.ReplicaDirectoryServers.Count))"
  W "FSMO: PDC=$($d.PDCEmulator -replace '\..*','')  RID=$($d.RIDMaster -replace '\..*','')  Infra=$($d.InfrastructureMaster -replace '\..*','')"
  W ""; W "-- Password policy (default domain)"; L (Get-ADDefaultDomainPasswordPolicy | Select-Object MinPasswordLength, ComplexityEnabled, MaxPasswordAge, MinPasswordAge, PasswordHistoryCount, LockoutThreshold, LockoutDuration)
  W ""; W "-- Privileged groups (member count + names)"
  foreach ($g in 'Domain Admins','Enterprise Admins','Schema Admins','Administrators','Account Operators','Backup Operators') { $m = Get-ADGroupMember $g -Recursive -ErrorAction SilentlyContinue; W ("  {0,-20} {1,3}  : {2}" -f $g, @($m).Count, (($m | Select-Object -ExpandProperty SamAccountName) -join ', ')) }
  W ""; W "-- Account hygiene"
  $u = Get-ADUser -Filter * -Properties Enabled, PasswordNeverExpires, PasswordNotRequired, LastLogonDate, PasswordLastSet, AdminCount, ServicePrincipalName
  W "  users total: $(@($u).Count) | enabled: $(@($u | Where-Object Enabled).Count)"
  W "  PasswordNeverExpires (enabled): $(($u | Where-Object { $_.Enabled -and $_.PasswordNeverExpires } | Select-Object -ExpandProperty SamAccountName) -join ', ')"
  W "  PasswordNotRequired (enabled): $(($u | Where-Object { $_.Enabled -and $_.PasswordNotRequired } | Select-Object -ExpandProperty SamAccountName) -join ', ')"
  W "  Stale >90d (enabled, no logon): $(($u | Where-Object { $_.Enabled -and $_.LastLogonDate -and $_.LastLogonDate -lt (Get-Date).AddDays(-90) } | Select-Object -ExpandProperty SamAccountName) -join ', ')"
  W "  Password older than 1 year (enabled): $(($u | Where-Object { $_.Enabled -and $_.PasswordLastSet -and $_.PasswordLastSet -lt (Get-Date).AddYears(-1) } | Select-Object -ExpandProperty SamAccountName) -join ', ')"
  W "  Accounts with SPN (kerberoastable, non-computer): $(($u | Where-Object { $_.ServicePrincipalName -and $_.Enabled } | Select-Object -ExpandProperty SamAccountName) -join ', ')"
  $krb = Get-ADUser krbtgt -Properties PasswordLastSet; W "  krbtgt password last set: $($krb.PasswordLastSet)  (should be rotated ~every 180 days)"
  $guest = Get-ADUser Guest -Properties Enabled; W "  Guest enabled: $($guest.Enabled)"
  W ""; W "-- Computers"; $c = Get-ADComputer -Filter * -Properties OperatingSystem, LastLogonDate; T ($c | Group-Object OperatingSystem | Select-Object Count, Name)
  W "  Stale computers >90d: $(($c | Where-Object { $_.LastLogonDate -lt (Get-Date).AddDays(-90) } | Select-Object -ExpandProperty Name) -join ', ')"
  W ""; W "-- AD health (dcdiag summary)"; W ((dcdiag /q 2>&1 | Out-String).Trim()); W "(empty = all tests passed)"
  W ""; W "-- Replication"; W ((repadmin /replsummary 2>&1 | Out-String).Trim())
  W ""; W "-- SYSVOL replication: $(if ((Get-Service DFSR).Status -eq 'Running') {'DFSR running'} else {'DFSR NOT running (FRS?)'})"
}
Try2 "AuditPolicy" { W ((auditpol /get /category:"Logon/Logoff","Account Logon","Account Management" 2>&1 | Out-String).Trim()) }
Try2 "LAPS" { W "LAPS (legacy AdmPwd.dll): $(Test-Path 'C:\Program Files\LAPS\CSE\AdmPwd.dll') | Windows LAPS policy key: $(Test-Path 'HKLM:\SOFTWARE\Microsoft\Policies\LAPS')" }
Try2 "NTLM/LDAP hardening" { $l = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Lsa'; W "LmCompatibilityLevel: $($l.LmCompatibilityLevel) (5 = NTLMv2 only, recommended)"; $n = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\NTDS\Parameters'; W "LDAPServerIntegrity (signing): $($n.'LDAPServerIntegrity') (2 = require) | LdapEnforceChannelBinding: $($n.LdapEnforceChannelBinding)" }
Try2 "PrintSpooler" { W "Print Spooler on DC: $((Get-Service Spooler).Status) (PrintNightmare — should be Disabled on a DC unless needed for the shared HP printer)" }

# ---------------------------------------------------------------- H. Patching, AV, backup
H "H. PATCHING / ANTIVIRUS / BACKUP / LOGS"
Try2 "Hotfixes" { $h = Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 5; T ($h | Select-Object HotFixID, Description, InstalledOn); W "days since last patch: $([int]((Get-Date) - ($h | Select-Object -First 1).InstalledOn).TotalDays)" }
Try2 "WU settings" { $au = Get-ItemProperty 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -ErrorAction SilentlyContinue; W "AUOptions: $($au.AUOptions) NoAutoUpdate: $($au.NoAutoUpdate) (blank = default)" }
Try2 "Defender" { L (Get-MpComputerStatus | Select-Object AMServiceEnabled, AntivirusEnabled, RealTimeProtectionEnabled, AntivirusSignatureLastUpdated, QuickScanEndTime, FullScanEndTime) }
Try2 "WindowsServerBackup" { W ((wbadmin get versions 2>&1 | Select-Object -First 25 | Out-String).Trim()) }
Try2 "ShadowCopies" { W ((vssadmin list shadows 2>&1 | Select-String 'creation time|For Volume' | Select-Object -Last 8 | Out-String).Trim()) }
Try2 "ScheduledTasks (non-Microsoft)" { T (Get-ScheduledTask | Where-Object { $_.TaskPath -notmatch '\\Microsoft\\' } | Select-Object TaskName, State, @{n='Action';e={ ($_.Actions.Execute -join ' ') -replace '\\[^\\]*$','\...' }}, @{n='RunAs';e={$_.Principal.UserId}}) }
Try2 "BitLocker" { T (Get-BitLockerVolume | Select-Object MountPoint, VolumeStatus, ProtectionStatus, EncryptionMethod) }
Try2 "EventLog sizes" { T (Get-WinEvent -ListLog Security, System, Application | Select-Object LogName, @{n='MaxMB';e={[math]::Round($_.MaximumSizeInBytes/1MB)}}, RecordCount, LastWriteTime) }
Try2 "Failed logons last 7d" { $ev = Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625; StartTime=(Get-Date).AddDays(-7)} -MaxEvents 5000; W "4625 (failed logon) events in 7 days: $(@($ev).Count)"; if ($ev) { T ($ev | ForEach-Object { $x=[xml]$_.ToXml(); [pscustomobject]@{ Src=MaskIP ($x.Event.EventData.Data | Where-Object Name -eq 'IpAddress').'#text'; User=($x.Event.EventData.Data | Where-Object Name -eq 'TargetUserName').'#text' } } | Group-Object Src, User | Sort-Object Count -Descending | Select-Object -First 10 Count, Name) } }
Try2 "TimeSync" { W ((w32tm /query /status 2>&1 | Select-String 'Source|Last Successful|Stratum' | Out-String).Trim()) }

# ---------------------------------------------------------------- done
H "END OF AUDIT"
$sb.ToString() | Set-Content -Path $out -Encoding UTF8
Write-Host "`nAudit written to: $out" -ForegroundColor Green
Write-Host "Nothing on this server was modified." -ForegroundColor Green
