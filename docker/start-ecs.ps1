# Requires Docker Desktop (or Docker Engine + Compose v2).
# Starts MySQL (ecs-mysql), then builds and starts the Debian client and server images.

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$serverEnvPath = Join-Path $repoRoot "server\server.env"
if (-not (Test-Path $serverEnvPath)) {
    New-Item -ItemType File -Path $serverEnvPath | Out-Null
    Write-Host "Created empty server\server.env. Add NAVIGATOR_TOOLKIT_API_KEY and NAVIGATOR_CLAUDE_API_KEY there for AI features."
}

docker info | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Docker is not running. Start Docker Desktop and try again."
}

& (Join-Path $PSScriptRoot "start-mysql.ps1")

Write-Host "Pulling and building Debian Node images if needed..."
docker compose build --pull
if ($LASTEXITCODE -ne 0) {
    throw "Image build failed. See the build output above."
}

Write-Host "Starting Event Cruncher Stylus client and server..."
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    throw "Containers failed to start. Ports 3000 and 4000 must be free on this machine."
}

docker compose ps

Write-Host ""
Write-Host "Client:  http://localhost:3000"
Write-Host "Server:  http://localhost:4000"
Write-Host "MySQL:   localhost:3306  (container ecs-mysql, database ecsdb)"
Write-Host "Stop apps with:  docker\stop-ecs.ps1"
Write-Host "Stop MySQL with: docker\stop-mysql.ps1"
