$out = "C:\Users\abden\Documents\moltbot-talent\diag-out.txt"
docker context use desktop-linux | Out-File $out
"`n=== docker ps -a ===" | Add-Content $out
docker ps -a | Add-Content $out
"`n=== postgres logs ===" | Add-Content $out
docker compose logs --tail=20 postgres 2>&1 | Add-Content $out
"`n=== port 5432 test ===" | Add-Content $out
(Test-NetConnection localhost -Port 5432 -InformationLevel Quiet) | Add-Content $out
Write-Host "Written to $out"
