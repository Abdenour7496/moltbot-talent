Write-Host "=== Available pipes ==="
[System.IO.Directory]::GetFiles('\\.\pipe') | Where-Object { $_ -match 'docker|wsl' }

Write-Host "`n=== Service status ==="
Get-Service com.docker.service | Select-Object Name, Status

Write-Host "`n=== Trying desktop-linux context ==="
docker context use desktop-linux 2>&1
docker version --format "Server: {{.Server.Version}}" 2>&1

Write-Host "`n=== Trying default context ==="
docker context use default 2>&1
docker version --format "Server: {{.Server.Version}}" 2>&1
