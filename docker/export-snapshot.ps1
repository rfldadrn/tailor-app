$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $projectRoot ".env"
$initDirectory = Join-Path $PSScriptRoot "init"
$dumpPath = Join-Path $initDirectory "10-local-snapshot.sql"

if (-not (Test-Path $envPath)) {
  throw "File .env tidak ditemukan. Jalankan script ini di komputer sumber database."
}
if (Test-Path $dumpPath) {
  throw "Snapshot sudah ada. Pindahkan file docker\init\10-local-snapshot.sql sebelum membuat snapshot baru."
}

$databaseLine = Get-Content $envPath | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $databaseLine) {
  throw "DATABASE_URL tidak ditemukan di .env."
}

$databaseUrl = $databaseLine.Substring($databaseLine.IndexOf("=") + 1).Trim().Trim('"').Trim("'")
$connection = [System.Uri]$databaseUrl
$credentials = $connection.UserInfo.Split(":", 2)
if ($credentials.Count -ne 2) {
  throw "DATABASE_URL harus menyertakan username dan password PostgreSQL."
}

$databaseUser = [System.Uri]::UnescapeDataString($credentials[0])
$databaseName = [System.Uri]::UnescapeDataString($connection.AbsolutePath.TrimStart("/"))
$databaseHost = $connection.Host
if ($databaseHost -eq "localhost" -or $databaseHost -eq "127.0.0.1" -or $databaseHost -eq "::1") {
  $databaseHost = "host.docker.internal"
}
$databasePort = if ($connection.IsDefaultPort) { 5432 } else { $connection.Port }

New-Item -ItemType Directory -Path $initDirectory -Force | Out-Null
$previousPassword = $env:PGPASSWORD
$env:PGPASSWORD = [System.Uri]::UnescapeDataString($credentials[1])
$mount = "type=bind,source=$initDirectory,target=/backup"
$dockerArguments = @(
  "run", "--rm",
  "--add-host", "host.docker.internal:host-gateway",
  "--env", "PGPASSWORD",
  "--mount", $mount,
  "postgres:17-alpine",
  "pg_dump", "--no-owner", "--no-acl",
  "--host", $databaseHost,
  "--port", "$databasePort",
  "--username", $databaseUser,
  "--dbname", $databaseName,
  "--file", "/backup/10-local-snapshot.sql"
)

try {
  & docker @dockerArguments
  $dumpExitCode = $LASTEXITCODE
}
finally {
  if ($null -eq $previousPassword) {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  } else {
    $env:PGPASSWORD = $previousPassword
  }
}

if ($dumpExitCode -ne 0) {
  Remove-Item -LiteralPath $dumpPath -ErrorAction SilentlyContinue
  throw "Ekspor snapshot gagal. Pastikan Docker aktif dan database PostgreSQL dapat dijangkau."
}

Write-Host "Snapshot berhasil dibuat di docker\init\10-local-snapshot.sql."
Write-Host "File berisi data sensitif; bagikan secara privat dan jangan commit ke Git."
