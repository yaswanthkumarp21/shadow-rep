# Level Up Tracker - restore from a backup zip.
#   .\restore.ps1 -Zip ..\backups\levelup-2026-10-22_0300.zip
# Safe by design: your CURRENT data is MOVED aside (data.before-restore-<time>), never deleted.
# -TargetRoot lets you practise a restore into a scratch folder without touching the live apps.
param(
    [Parameter(Mandatory)][string]$Zip,
    [string]$TargetRoot,
    [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
# (Windows PowerShell 5.1 leaves $PSScriptRoot empty inside param defaults when a parameter is Mandatory.)
$projectRoot = Split-Path $PSScriptRoot -Parent
if (-not $TargetRoot) { $TargetRoot = $projectRoot }
$env:Path += ';C:\Program Files\Docker\Docker\resources\bin'

$Zip = (Resolve-Path $Zip).Path
$live = ($TargetRoot -eq $projectRoot)
$ogDir = Join-Path $TargetRoot 'opengym'
$ntDir = Join-Path $TargetRoot 'nutritrace'
$stage = Join-Path $env:TEMP ("levelup-restore-" + (Get-Date -Format 'HHmmss'))
$when  = Get-Date -Format 'yyyyMMdd-HHmmss'

# docker writes progress to stderr, which PowerShell would treat as an error - so run it through here.
function Compose($dir, [string[]]$cmd) {
    Push-Location $dir
    $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    docker compose @cmd *> $null
    $code = $LASTEXITCODE
    $ErrorActionPreference = $old
    Pop-Location
    if ($code -ne 0) { throw "docker compose $($cmd -join ' ') failed in $dir" }
}

Expand-Archive $Zip $stage
foreach ($p in 'opengym-data','nutritrace-db','nutritrace-uploads','opengym.env','nutritrace.env') {
    if (-not (Test-Path (Join-Path $stage $p))) { Remove-Item $stage -Recurse -Force; Write-Error "Backup is missing '$p' - not a valid backup."; exit 1 }
}
if ($DryRun) { Write-Host "Backup looks valid: $Zip"; Remove-Item $stage -Recurse -Force; exit 0 }

if ($live) {
    Compose $ogDir @('stop')
    Compose $ntDir @('stop')
}

function Place($src, $dest) {
    if (Test-Path $dest) { Move-Item $dest "$dest.before-restore-$when" }
    New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
    Move-Item $src $dest
}
Place (Join-Path $stage 'opengym-data')       (Join-Path $ogDir 'data')
Place (Join-Path $stage 'nutritrace-db')      (Join-Path $ntDir 'data\db')
Place (Join-Path $stage 'nutritrace-uploads') (Join-Path $ntDir 'data\uploads')
Place (Join-Path $stage 'opengym.env')        (Join-Path $ogDir '.env')
Place (Join-Path $stage 'nutritrace.env')     (Join-Path $ntDir '.env')
Remove-Item $stage -Recurse -Force

if ($live) {
    Compose $ogDir @('up','-d')
    Compose $ntDir @('up','-d')
    Write-Host 'Restored and restarted. Previous data kept next to the originals as *.before-restore-*'
} else {
    Write-Host "Practice restore finished in $TargetRoot (live apps untouched)."
}
