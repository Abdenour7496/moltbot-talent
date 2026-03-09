# Run this as Administrator
Write-Host "=== Starting Docker backend service ===" -ForegroundColor Cyan

$svc = Get-Service 'com.docker.service' -ErrorAction SilentlyContinue
if ($null -eq $svc) {
    Write-Host "ERROR: com.docker.service not found" -ForegroundColor Red
    exit 1
}

if ($svc.Status -ne 'Running') {
    Write-Host "Starting com.docker.service..."
    Start-Service 'com.docker.service'
    Start-Sleep -Seconds 3
    $svc.Refresh()
    Write-Host "Service status: $($svc.Status)"
} else {
    Write-Host "Service already running."
}

Write-Host "`n=== Waiting for dockerDesktopLinuxEngine pipe (up to 30s) ===" -ForegroundColor Cyan
$timeout = 30
$elapsed = 0
$found = $false
while ($elapsed -lt $timeout) {
    $pipes = [System.IO.Directory]::GetFiles('\\.\pipe')
    if ($pipes | Where-Object { $_ -match 'dockerDesktopLinuxEngine' }) {
        $found = $true
        break
    }
    Start-Sleep -Seconds 2
    $elapsed += 2
    Write-Host "  Waiting... ($elapsed/$timeout s)"
}

if ($found) {
    Write-Host "`ndockerDesktopLinuxEngine pipe is UP!" -ForegroundColor Green
} else {
    Write-Host "`nPipe not found after ${timeout}s. Docker Desktop may still be initializing." -ForegroundColor Yellow
    Write-Host "Available docker-related pipes:"
    [System.IO.Directory]::GetFiles('\\.\pipe') | Where-Object { $_ -match 'docker|wsl' }
}
