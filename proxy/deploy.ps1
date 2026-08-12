# Despliegue del proxy IA en Vercel (PowerShell)
# Ejecutar desde la carpeta proxy/

$ErrorActionPreference = "Stop"
$ProxyDir = $PSScriptRoot
Set-Location $ProxyDir

Write-Host "==> Instalando dependencias..." -ForegroundColor Cyan
npm install

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    throw "npx no encontrado. Instale Node.js."
}

Write-Host "==> Verificando sesion Vercel..." -ForegroundColor Cyan
$whoami = npx vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Inicie sesion en Vercel (se abrira el navegador):" -ForegroundColor Yellow
    npx vercel login
}

Write-Host "==> Vinculando proyecto..." -ForegroundColor Cyan
npx vercel link --yes --project planify-ai-proxy 2>$null
if ($LASTEXITCODE -ne 0) {
    npx vercel link --yes
}

$openRouterKey = $env:OPENROUTER_API_KEY
if (-not $openRouterKey) {
    $envFile = Join-Path $ProxyDir ".env.local"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^OPENROUTER_API_KEY=(.+)$') { $openRouterKey = $matches[1].Trim() }
        }
    }
}
if (-not $openRouterKey) {
    throw "Defina OPENROUTER_API_KEY en .env.local o como variable de entorno"
}

$saPath = Join-Path $ProxyDir "service-account.json"
if (-not (Test-Path $saPath)) {
    throw "Falta service-account.json en la carpeta proxy/"
}
$saJson = (Get-Content $saPath -Raw).Trim()

function Set-VercelEnv($name, $value, $envName) {
    Write-Host "    Configurando $name ($envName)..." -ForegroundColor Gray
    npx vercel env rm $name $envName --yes 2>$null | Out-Null
    $value | npx vercel env add $name $envName --force
    if ($LASTEXITCODE -ne 0) { throw "Error al configurar $name" }
}

Write-Host "==> Configurando variables de entorno..." -ForegroundColor Cyan
foreach ($env in @("production", "preview", "development")) {
    Set-VercelEnv "OPENROUTER_API_KEY" $openRouterKey $env
    Set-VercelEnv "FIREBASE_SERVICE_ACCOUNT" $saJson $env
    Set-VercelEnv "ALLOWED_ORIGIN" "*" $env
}

Write-Host "==> Desplegando a produccion..." -ForegroundColor Cyan
$deployOutput = npx vercel deploy --prod --yes 2>&1 | Out-String
Write-Host $deployOutput

$urlMatch = [regex]::Match($deployOutput, 'https://[^\s]+\.vercel\.app')
if (-not $urlMatch.Success) {
    $inspect = npx vercel inspect --prod 2>&1 | Out-String
    $urlMatch = [regex]::Match($inspect, 'https://[^\s]+\.vercel\.app')
}

if ($urlMatch.Success) {
    $baseUrl = $urlMatch.Value.TrimEnd('/')
    $proxyUrl = "$baseUrl/api/ai-chat"
    Write-Host ""
    Write-Host "DESPLIEGUE OK" -ForegroundColor Green
    Write-Host "PROXY_URL: $proxyUrl" -ForegroundColor Green

    $configPath = Join-Path $ProxyDir "..\js\config\openrouter-config.js"
    if (Test-Path $configPath) {
        $config = Get-Content $configPath -Raw
        $config = $config -replace "PROXY_URL:\s*'[^']*'", "PROXY_URL: '$proxyUrl'"
        Set-Content $configPath $config -NoNewline
        Write-Host "openrouter-config.js actualizado." -ForegroundColor Green
    }
} else {
    Write-Host "Despliegue completado. Verifique la URL en el dashboard de Vercel." -ForegroundColor Yellow
}
