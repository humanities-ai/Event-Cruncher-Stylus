$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

docker compose down

Write-Host "Client and server containers are stopped."
Write-Host "MySQL (ecs-mysql) is still running. Stop it with: docker\stop-mysql.ps1"
