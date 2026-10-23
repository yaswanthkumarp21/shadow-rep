# Shadow Rep - restore from a backup zip.
#   .\restore.ps1 -Zip ..\backups\shadowrep-2026-10-22_0300.zip
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
$ogDir = Join-Path $TargetRoot 'apps\gym'
$ntDir = Join-Path $TargetRoot 'apps\food'
$stage = Join-Path $env:TEMP ("shadowrep-restore-" + (Get-Date -Format 'HHmmss'))
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
$legacy = Test-Path (Join-Path $stage 'opengym-data')   # backups made before the rename use the old entry names
$N = if ($legacy) { @{ gd='opengym-data'; fd='nutritrace-db'; fu='nutritrace-uploads'; ge='opengym.env'; fe='nutritrace.env' } } else { @{ gd='gym-data'; fd='food-db'; fu='food-uploads'; ge='gym.env'; fe='food.env' } }
foreach ($p in $N.gd,$N.fd,$N.fu,$N.ge,$N.fe) {
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
Place (Join-Path $stage $N.gd)       (Join-Path $ogDir 'data')
Place (Join-Path $stage $N.fd)      (Join-Path $ntDir 'data\db')
Place (Join-Path $stage $N.fu) (Join-Path $ntDir 'data\uploads')
Place (Join-Path $stage $N.ge)        (Join-Path $ogDir '.env')
Place (Join-Path $stage $N.fe)     (Join-Path $ntDir '.env')
Remove-Item $stage -Recurse -Force

if ($live) {
    Compose $ogDir @('up','-d')
    Compose $ntDir @('up','-d')
    Write-Host 'Restored and restarted. Previous data kept next to the originals as *.before-restore-*'
} else {
    Write-Host "Practice restore finished in $TargetRoot (live apps untouched)."
}
