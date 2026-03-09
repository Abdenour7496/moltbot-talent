$pipes = [System.IO.Directory]::GetFiles('\\.\pipe')
$pipes | Where-Object { $_ -match 'docker|wsl' }
