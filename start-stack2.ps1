Set-Location "C:\Users\abden\Documents\moltbot-talent"
$env:DOCKER_HOST = "npipe:////./pipe/dockerCagent"
docker compose up -d
docker compose ps
