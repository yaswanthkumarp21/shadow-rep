# Shadow Rep - backup. Double-click backup.bat (or run this file).
# Makes backups\levelup-YYYY-MM-DD_HHmm.zip containing OpenGym data, NutriTrace DB + uploads,
# and the two .env files (they hold secrets - keep backups private). Keeps the newest 14.
param(
    [string]$Root = (Split-Path $PSScriptRoot -Parent),
    [int]$Keep = 14
)
$ErrorActionPreference = 'Stop'
$env:Path += ';C:\Program Files\Docker\Docker\resources\bin'

$backups = Join-Path $Root 'backups'
$stamp   = Get-Date -Format 'yyyy-MM-dd_HHmm'
$stage   = Join-Path $env:TEMP "levelup-stage-$stamp"
$zip     = Join-Path $backups "levelup-$stamp.zip"
$ogDir   = Join-Path $Root 'opengym'
$ntDir   = Join-Path $Root 'nutritrace'

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

$old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
docker info *> $null; $dockerOk = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $old
if (-not $dockerOk) { Write-Error 'Docker is not running. Start Docker Desktop and try again.'; exit 1 }

New-Item -ItemType Directory -Force $backups | Out-Null
New-Item -ItemType Directory -Force $stage   | Out-Null

# Stop the writers for a few seconds so files (and the SQLite DB) are copied in a consistent state.
try {
    Compose $ogDir @('stop','api')
    Compose $ntDir @('stop')
    Copy-Item (Join-Path $ogDir 'data')            (Join-Path $stage 'opengym-data')      -Recurse
    Copy-Item (Join-Path $ntDir 'data\db')         (Join-Path $stage 'nutritrace-db')     -Recurse
    Copy-Item (Join-Path $ntDir 'data\uploads')    (Join-Path $stage 'nutritrace-uploads') -Recurse
    Copy-Item (Join-Path $ogDir '.env')            (Join-Path $stage 'opengym.env')
    Copy-Item (Join-Path $ntDir '.env')            (Join-Path $stage 'nutritrace.env')
}
finally {
    # Always bring the apps back, even if copying failed.
    Compose $ogDir @('start','api')
    Compose $ntDir @('start')
}

Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal
Remove-Item $stage -Recurse -Force

# Rotation: delete only old backup zips made by this script, beyond the newest $Keep.
Get-ChildItem $backups -Filter 'levelup-*.zip' | Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $Keep | Remove-Item -Force

$size = '{0:N1} MB' -f ((Get-Item $zip).Length / 1MB)
Write-Host "Backup done: $zip ($size)"
