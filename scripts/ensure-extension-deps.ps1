# Built-in extension runtime deps (extensions/*/node_modules) — postinstall 누락 시 복구
param(
    [switch]$Quiet,
    [string]$VscodeDir = "$PSScriptRoot\..\vscode-main\vscode-main"
)

$ErrorActionPreference = "Stop"
$vscode = Resolve-Path $VscodeDir -ErrorAction SilentlyContinue
if (-not $vscode) {
    Write-Error "VSCode 소스가 없습니다: $VscodeDir"
}

# Dev startup에서 자주 실패하는 확장 (out/는 있으나 node_modules 없음)
$extensions = @(
    'emmet',
    'github-authentication',
    'git',
    'github',
    'microsoft-authentication',
    'typescript-language-features',
    'html-language-features',
    'css-language-features',
    'json-language-features',
    'markdown-language-features'
)

$missing = @()
foreach ($name in $extensions) {
    $extDir = Join-Path $vscode "extensions\$name"
    if (-not (Test-Path (Join-Path $extDir "package.json"))) { continue }
    if (-not (Test-Path (Join-Path $extDir "node_modules"))) {
        $missing += $name
    }
}

if ($missing.Count -eq 0) {
    if (-not $Quiet) { Write-Host "Extension deps OK." }
    exit 0
}

if (-not $Quiet) {
    Write-Host "Missing extension node_modules: $($missing -join ', ')"
    Write-Host "Installing (npm install per extension)..."
}

$npm = if (Get-Command npm.cmd -ErrorAction SilentlyContinue) { "npm.cmd" } else { "npm" }
$failed = @()
foreach ($name in $missing) {
    $extDir = Join-Path $vscode "extensions\$name"
    if (-not $Quiet) { Write-Host "  extensions/$name" }
    Push-Location $extDir
    & $npm install --no-fund --no-audit 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { $failed += $name }
    Pop-Location
}

if ($failed.Count -gt 0) {
    Write-Host "Failed: $($failed -join ', '). Run: cd vscode-main\vscode-main && npm ci" -ForegroundColor Red
    exit 1
}

if (-not $Quiet) { Write-Host "Extension deps installed." }
