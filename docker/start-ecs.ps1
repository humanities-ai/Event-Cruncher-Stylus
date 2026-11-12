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

# Load repo-root .env (see .env.example) so ports/URLs printed below match
# what docker compose actually uses.
$dotEnvPath = Join-Path $repoRoot ".env"
if (Test-Path $dotEnvPath) {
    Get-Content $dotEnvPath | ForEach-Object {
        if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim(), "Process")
        }
    }
}
$serverPort = if ($env:SERVER_PORT) { $env:SERVER_PORT } else { "4000" }
$clientPort = if ($env:CLIENT_PORT) { $env:CLIENT_PORT } else { "3000" }

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
    throw "Containers failed to start. Ports $clientPort and $serverPort must be free on this machine."
}

docker compose ps

Write-Host ""
Write-Host "Client:  http://localhost:$clientPort"
Write-Host "Server:  http://localhost:$serverPort"
Write-Host "MySQL:   localhost:3306  (container ecs-mysql, database ecsdb)"
Write-Host "Stop apps with:  docker\stop-ecs.ps1"
Write-Host "Stop MySQL with: docker\stop-mysql.ps1"
