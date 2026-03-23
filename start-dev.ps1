$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

Write-Host "Starting Django backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendPath'; python manage.py runserver 0.0.0.0:8000"

Start-Sleep -Seconds 2

Write-Host "Starting React frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendPath'; npm start"

Write-Host "Development servers launched." -ForegroundColor Green
Write-Host "Backend:  http://127.0.0.1:8000/ (also reachable from localhost)" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000/" -ForegroundColor Yellow
