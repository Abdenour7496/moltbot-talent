Set-Location "C:\Users\abden\Documents\moltbot-talent"

Write-Host "=== Setting Docker context ===" -ForegroundColor Cyan
docker context use desktop-linux

Write-Host "`n=== Container status ===" -ForegroundColor Cyan
docker compose ps

Write-Host "`n=== Starting/restarting containers ===" -ForegroundColor Cyan
docker compose up -d --force-recreate

Write-Host "`n=== Waiting for Postgres to be healthy (up to 60s) ===" -ForegroundColor Cyan
$timeout = 60
$elapsed = 0
$ready = $false
while ($elapsed -lt $timeout) {
    $result = docker compose exec -T postgres pg_isready -U moltbot 2>&1
    if ($result -match "accepting connections") {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 3
    $elapsed += 3
    Write-Host "  Waiting... ($elapsed/$timeout s) - $result"
}

if (-not $ready) {
    Write-Host "`nPostgres not ready after ${timeout}s. Check logs:" -ForegroundColor Red
    docker compose logs postgres
    exit 1
}

Write-Host "`nPostgres is ready!" -ForegroundColor Green

Write-Host "`n=== Running Prisma migrations ===" -ForegroundColor Cyan
Set-Location "C:\Users\abden\Documents\moltbot-talent\gui\api"
npx prisma migrate deploy

Write-Host "`n=== Done! ===" -ForegroundColor Green
Write-Host "  Postgres : localhost:5432"
Write-Host "  Redis    : localhost:6379"
Write-Host "`nNow run: pnpm dev:gui (from the repo root)"
