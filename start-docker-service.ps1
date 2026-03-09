Start-Service com.docker.service
Start-Sleep -Seconds 5
Get-Service com.docker.service | Select-Object Name, Status
[System.IO.Directory]::GetFiles('\\.\pipe') | Where-Object { $_ -match 'docker|wsl' }
