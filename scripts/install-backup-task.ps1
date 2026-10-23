# Shadow Rep - (re)installs the nightly backup in Windows Task Scheduler, pointing at THIS folder.
# Run it again after moving or renaming the project folder. Safe to run any number of times.
$ErrorActionPreference = 'Stop'
$root   = Split-Path $PSScriptRoot -Parent
$script = Join-Path $PSScriptRoot 'backup.ps1'
$name   = 'ShadowRep-Backup'

# remove the task under its old working name, if it is still there
foreach ($old in 'LevelUpTracker-Backup') {
    if (Get-ScheduledTask -TaskName $old -ErrorAction SilentlyContinue) { Unregister-ScheduledTask -TaskName $old -Confirm:$false; Write-Host "Removed old task '$old'" }
}

$action   = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $script)
$trigger  = New-ScheduledTaskTrigger -Daily -At 3:00AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings `
    -Description 'Nightly backup of Shadow Rep data (keeps the newest 14)' -Force | Out-Null

$info = Get-ScheduledTask -TaskName $name | Get-ScheduledTaskInfo
Write-Host "Installed '$name': runs daily at 03:00 (or when the PC is next on). Next run: $($info.NextRunTime)"
Write-Host "Backup script: $script"
