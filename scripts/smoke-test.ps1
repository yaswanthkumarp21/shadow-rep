# Shadow Rep - health check. Double-click smoke-test.bat, or run this file.
# Prints PASS / FAIL for each part and tells you what to do about a FAIL. Changes nothing.
param([string]$Root = '')
if (-not $Root) { $Root = Split-Path $PSScriptRoot -Parent }
$env:Path += ';C:\Program Files\Docker\Docker\resources\bin;C:\Program Files\Tailscale'

$script:fails = 0
function Check($name, [scriptblock]$test, $fix) {
    $ok = $false; $detail = ''
    try { $r = & $test; if ($r -is [string]) { $detail = $r; $ok = $true } else { $ok = [bool]$r } } catch { $detail = $_.Exception.Message }
    if ($ok) { Write-Host ("PASS  " + $name + $(if ($detail) { "  ($detail)" })) -ForegroundColor Green }
    else { $script:fails++; Write-Host ("FAIL  " + $name + $(if ($detail) { "  ($detail)" })) -ForegroundColor Red; if ($fix) { Write-Host ("      -> " + $fix) -ForegroundColor Yellow } }
}
function Get-Env($file, $key) { ((Get-Content $file -ErrorAction SilentlyContinue | ? { $_ -match "^$key=" } | Select -First 1) -replace "^$key=", '').Trim() }
function Http($url, $method = 'GET') { try { Invoke-WebRequest $url -Method $method -UseBasicParsing -TimeoutSec 15 } catch { $_.Exception.Response } }

$host_ = Get-Env "$Root\apps\gym\.env" 'RP_ID'
$base = "https://$host_"

Write-Host "`nShadow Rep - health check`n" -ForegroundColor Cyan

Check 'Docker is running' { $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'; docker info *> $null; $c = $LASTEXITCODE; $ErrorActionPreference = $old; $c -eq 0 } 'Start Docker Desktop and wait for "Engine running".'

foreach ($c in 'shadowrep-gym-api-1', 'shadowrep-gym-web-1', 'shadowrep-food', 'shadowrep-proxy', 'shadowrep-foodtheme') {
    Check "Container $c is up" {
        $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
        $s = docker inspect -f '{{.State.Status}}|{{.HostConfig.RestartPolicy.Name}}' $c 2>$null
        $ErrorActionPreference = $old
        $st, $rp = "$s".Split('|')
        if ($st -ne 'running') { throw "state: $st" }
        if ($rp -ne 'unless-stopped') { throw "restart policy is '$rp' (should be unless-stopped)" }
        "running, restarts automatically"
    } "Run:  docker compose up -d   (in apps\gym, apps\food and the main folder)"
}

Check 'Tailscale is connected' { $j = (& tailscale status --json | ConvertFrom-Json); if ($j.BackendState -ne 'Running') { throw $j.BackendState }; "as " + $j.Self.DNSName.TrimEnd('.') } 'Open Tailscale from the system tray and sign in / connect.'
Check 'Tailscale Serve is publishing the address' { $s = (& tailscale serve status) -join ' '; if ($s -notmatch '8090') { throw 'no serve rule for port 8090' }; "private to your devices" } "Run:  tailscale serve --bg --https=443 http://127.0.0.1:8090"

Check 'Gym app answers over HTTPS' { $r = Http "$base/api/health"; if ($r.StatusCode -ne 200) { throw "HTTP $($r.StatusCode)" }; ($r.Content | ConvertFrom-Json).ok } 'Check the containers above; then docker compose logs api  (in the opengym folder).'
Check 'OpenGym home page loads' { (Http "$base/").StatusCode -eq 200 } 'See the line above.'
Check 'Food app answers at /food/' { $r = Http "$base/food/api/health"; if ($r.StatusCode -ne 200) { throw "HTTP $($r.StatusCode)" }; $true } 'In the nutritrace folder:  docker compose logs'
Check 'NutriTrace System skin is being added' {
    $h = Http "$base/food/"; if ($h.StatusCode -ne 200) { throw "HTTP $($h.StatusCode)" }
    if ($h.Content -notmatch '/_sr/system\.css') { throw 'skin link missing from the NutriTrace page' }
    $c = Http "$base/food/_sr/system.css"; if ($c.StatusCode -ne 200) { throw "stylesheet HTTP $($c.StatusCode)" }
    $f = Http "$base/food/_sr/fonts/orbitron-latin-700-normal.woff2"; if ($f.StatusCode -ne 200) { throw "font HTTP $($f.StatusCode)" }
    "page + stylesheet + fonts"
} 'In the shadow-rep folder run:  docker compose up -d   (starts the "foodtheme" container).'
Check 'Nutrition link is locked to signed-in users' { (Http "$base/api/nutrition/today").StatusCode -eq 401 } 'Rebuild OpenGym:  docker compose up -d --build  (in the opengym folder).'

$tok = Get-Env "$Root\apps\gym\.env" 'NUTRITRACE_TOKEN'
Check 'NutriTrace read-only token works' {
    if (-not $tok) { throw 'NUTRITRACE_TOKEN is empty in apps\gym\.env' }
    $body = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_goals","arguments":{}}}'
    $r = Invoke-WebRequest "http://localhost:3001/food/api/mcp" -Method Post -Headers @{ Authorization = "Bearer $tok"; Accept = 'application/json, text/event-stream' } -ContentType 'application/json' -Body $body -UseBasicParsing -TimeoutSec 15
    $r.StatusCode -eq 200
} 'Create a new token in NutriTrace (Settings -> API Tokens, mcp:read only) and paste it after NUTRITRACE_TOKEN= in apps\gym\.env, then restart OpenGym.'

Check 'Passkey address matches (RP_ID / ORIGIN)' { $o = Get-Env "$Root\apps\gym\.env" 'ORIGIN'; if ($o -ne $base) { throw "ORIGIN is $o" }; $host_ } 'RP_ID and ORIGIN in apps\gym\.env must match the address bar exactly. Do NOT change them (it breaks passkeys).'
Check 'NutriTrace secret cookies (HTTPS) are on' { -not (Get-Content "$Root\apps\food\.env" | ? { $_ -match '^INSECURE_COOKIES=' }) } 'Remove the INSECURE_COOKIES line from nutritrace\.env.'
Check 'No secrets are tracked by git' { Push-Location $Root; $t = git ls-files | ? { $_ -match '\.env$|\.db$|^backups/|^apps/[a-z]+/data/' }; Pop-Location; if ($t) { throw ($t -join ', ') }; $true } 'Run: git rm --cached <file>   and check .gitignore.'

$task = Get-ScheduledTask -TaskName 'ShadowRep-Backup' -ErrorAction SilentlyContinue
Check 'Daily backup is scheduled' { if (-not $task) { throw 'task missing' }; $i = $task | Get-ScheduledTaskInfo; "next run " + $i.NextRunTime } 'Tell Claude: re-create the ShadowRep-Backup scheduled task.'
Check 'A recent backup exists (last 3 days)' {
    $b = Get-ChildItem "$Root\backups" -Filter 'shadowrep-*.zip' -ErrorAction SilentlyContinue | Sort LastWriteTime -Desc | Select -First 1
    if (-not $b) { throw 'no backups yet' }
    if ($b.LastWriteTime -lt (Get-Date).AddDays(-3)) { throw "newest is from $($b.LastWriteTime.ToString('yyyy-MM-dd'))" }
    "$($b.Name), $('{0:N1}' -f ($b.Length/1MB)) MB"
} 'Double-click scripts\backup.bat now, then check why the scheduled one did not run (is the PC often off at 3:00?).'
Check 'Docker Desktop starts when you sign in' { $f = "$env:APPDATA\Docker\settings-store.json"; (Get-Content $f -Raw | ConvertFrom-Json).AutoStart -eq $true } 'Docker Desktop -> Settings -> General -> tick "Start Docker Desktop when you sign in".'

Write-Host ""
if ($script:fails -eq 0) { Write-Host "Everything is healthy." -ForegroundColor Green } else { Write-Host "$($script:fails) check(s) need attention (see the yellow lines)." -ForegroundColor Red }
exit $script:fails
