$pipes = [System.IO.Directory]::GetFiles('\\.\pipe')
Write-Host "=== All Docker/WSL pipes ==="
$pipes | Where-Object { $_ -match 'docker|wsl' }

Write-Host "`n=== Docker info (default context) ==="
$env:DOCKER_HOST = ""
docker context use default 2>&1
docker info 2>&1 | Select-String "OS Type|Server Version|Operating System|Architecture"
