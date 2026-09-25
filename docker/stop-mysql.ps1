$ErrorActionPreference = "Stop"

$containerName = "ecs-mysql"

$containerIds = docker ps -a --filter "name=^/$containerName$" --format "{{.ID}}"
if (-not $containerIds) {
    Write-Host "Container $containerName does not exist."
    exit 0
}

docker stop $containerName | Out-Null
Write-Host "Stopped $containerName. Data volume ecs-mysql-data was kept."
Write-Host "Start again with:  docker\start-mysql.ps1"
