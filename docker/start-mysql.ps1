# Pulls mysql:8 if needed, then creates and starts the ecs-mysql container.
# Publishes 3306 on the host and joins Docker network ecs-net so the ECS server can reach it.

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$containerName = "ecs-mysql"
$networkName = "ecs-net"
$volumeName = "ecs-mysql-data"
$initSql = Join-Path $repoRoot "docker\init-ecsdb.sql"

docker info | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Docker is not running. Start Docker Desktop and try again."
}

Write-Host "Pulling mysql:8 if it is not already present..."
docker pull mysql:8

$networkExists = docker network ls --format "{{.Name}}" | Where-Object { $_ -eq $networkName }
if (-not $networkExists) {
    Write-Host "Creating Docker network $networkName..."
    docker network create $networkName | Out-Null
}

$containerIds = docker ps -a --filter "name=^/$containerName$" --format "{{.ID}}"
if ($containerIds) {
    $running = docker ps --filter "name=^/$containerName$" --format "{{.ID}}"
    if (-not $running) {
        Write-Host "Starting existing container $containerName..."
        docker start $containerName | Out-Null
    } else {
        Write-Host "Container $containerName is already running."
    }

    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    docker network connect --alias mysql $networkName $containerName 2>$null | Out-Null
    $ErrorActionPreference = $previousErrorAction
} else {
    Write-Host "Creating container $containerName..."
    docker run -d `
        --name $containerName `
        --network $networkName `
        --network-alias mysql `
        --restart unless-stopped `
        -e MYSQL_ROOT_PASSWORD=mysql `
        -e MYSQL_DATABASE=ecsdb `
        -p 3306:3306 `
        -v "${volumeName}:/var/lib/mysql" `
        -v "${initSql}:/docker-entrypoint-initdb.d/01-init-ecsdb.sql:ro" `
        mysql:8 | Out-Null
}

Write-Host "Waiting for MySQL to accept connections..."
$ready = $false
$previousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"
for ($attempt = 1; $attempt -le 40; $attempt++) {
    docker exec $containerName mysqladmin ping -h 127.0.0.1 -uroot -pmysql --silent 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 2
}
$ErrorActionPreference = $previousErrorAction

if (-not $ready) {
    throw "MySQL did not become ready in time. Check: docker logs $containerName"
}

Write-Host "Applying ECS schema (safe to re-run)..."
Get-Content -Raw $initSql | docker exec -i $containerName mysql -uroot -pmysql ecsdb

Write-Host ""
Write-Host "MySQL is running."
Write-Host "  Container: $containerName"
Write-Host "  Host port: 3306"
Write-Host "  Database:  ecsdb"
Write-Host "  User:      root"
Write-Host "  Password:  mysql"
Write-Host "  Docker DNS: ecs-mysql  (alias: mysql)"
Write-Host "Stop with:  docker\stop-mysql.ps1"
