# Sincroniza EXPO_PUBLIC_* desde app/.env hacia GitHub Actions (requiere: gh auth login).
# Uso: pwsh -File scripts/sync-github-actions-secrets.ps1

$ErrorActionPreference = "Stop"
$repo = "javieraguileracofre/evalua_V1_commerce"
$envFile = Join-Path $PSScriptRoot "..\app\.env"

if (-not (Test-Path $envFile)) {
  throw "No existe $envFile"
}

gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  throw "No estas logueado en GitHub CLI. Ejecuta: gh auth login"
}

$lines = Get-Content $envFile
$url = ($lines | Where-Object { $_ -match '^\s*EXPO_PUBLIC_SUPABASE_URL=' }) -replace '^\s*EXPO_PUBLIC_SUPABASE_URL=\s*', '' | ForEach-Object { $_.Trim() }
$key = ($lines | Where-Object { $_ -match '^\s*EXPO_PUBLIC_SUPABASE_ANON_KEY=' }) -replace '^\s*EXPO_PUBLIC_SUPABASE_ANON_KEY=\s*', '' | ForEach-Object { $_.Trim() }
$jwt = ($lines | Where-Object { $_ -match '^\s*EXPO_PUBLIC_SUPABASE_ANON_JWT=' }) -replace '^\s*EXPO_PUBLIC_SUPABASE_ANON_JWT=\s*', '' | ForEach-Object { $_.Trim() }

if (-not $url) {
  throw "Falta EXPO_PUBLIC_SUPABASE_URL en app/.env"
}
if (-not $key -and -not $jwt) {
  throw "Falta EXPO_PUBLIC_SUPABASE_ANON_KEY o EXPO_PUBLIC_SUPABASE_ANON_JWT en app/.env"
}

gh secret set EXPO_PUBLIC_SUPABASE_URL --repo $repo --body $url
if ($key) {
  gh secret set EXPO_PUBLIC_SUPABASE_ANON_KEY --repo $repo --body $key
}
if ($jwt) {
  gh secret set EXPO_PUBLIC_SUPABASE_ANON_JWT --repo $repo --body $jwt
}

Write-Host "Listo: secretos actualizados en $repo"
