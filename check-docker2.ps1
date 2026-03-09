Write-Host "=== All pipes ==="
[System.IO.Directory]::GetFiles('\\.\pipe') | Where-Object { $_ -match 'docker|wsl' }

Write-Host "`n=== Docker Desktop service ==="
Get-Service | Where-Object { $_.Name -match 'docker' } | Select-Object Name, Status

Write-Host "`n=== WSL distros ==="
wsl -l -v
