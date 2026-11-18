$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

$snapshotPath = Join-Path $PSScriptRoot "init\10-local-snapshot.sql"
if (-not (Test-Path $snapshotPath)) {
  throw "Snapshot belum ada. Salin file snapshot yang dibagikan secara privat ke docker\init\10-local-snapshot.sql."
}

$dockerEnvPath = Join-Path $projectRoot ".env.docker"
if (-not (Test-Path $dockerEnvPath)) {
  function New-UrlSafeSecret([int]$byteCount) {
    $bytes = New-Object byte[] $byteCount
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
      $generator.GetBytes($bytes)
    }
    finally {
      $generator.Dispose()
    }
    return [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
  }

    $defaultPort = if ($env:APP_PORT) { $env:APP_PORT } else { "3000" }
  $settings = @(
    "AUTH_SECRET=$(New-UrlSafeSecret 48)"
    "POSTGRES_PASSWORD=$(New-UrlSafeSecret 32)"
      "APP_PORT=$defaultPort"
  ) -join "`n"
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($dockerEnvPath, "$settings`n", $encoding)
}

& docker compose --env-file $dockerEnvPath up --build -d
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$dockerEnvContents = Get-Content $dockerEnvPath
$portLine = $dockerEnvContents | Where-Object { $_ -match '^APP_PORT=' } | Select-Object -First 1
$appPort = if ($portLine) { $portLine.Substring("APP_PORT=".Length) } else { "3000" }
Write-Host "Aplikasi berjalan di http://localhost:$appPort"
Write-Host "Database disimpan di Docker volume kasapp-postgres-data."
