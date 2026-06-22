# Kcode native 모듈 재빌드 (@vscode/* Electron ABI)
param(
    [switch]$FullCi,
    [string]$VscodeDir = "$PSScriptRoot\..\vscode-main\vscode-main"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."
$vscode = Resolve-Path $VscodeDir -ErrorAction SilentlyContinue

if (-not $vscode) {
    Write-Error "VSCode 소스가 없습니다: $VscodeDir"
}

# Node 24 (.nvmrc) — 포터블 또는 시스템
$portableNode = Join-Path $root ".tools\node-v24.15.0-win-x64\node.exe"
$nodeExe = if (Test-Path $portableNode) { $portableNode } else { (Get-Command node -ErrorAction Stop).Source }
$nodeDir = Split-Path $nodeExe -Parent
$env:PATH = "$nodeDir;$env:PATH"

$nvmrc = (Get-Content (Join-Path $vscode ".nvmrc") -Raw).Trim()
$nodeVer = & $nodeExe -v
Write-Host "Node: $nodeVer (required: v$nvmrc)"
if ($nodeVer -ne "v$nvmrc") {
    Write-Warning "Node 버전이 .nvmrc와 다릅니다. .\scripts\use-node24.ps1 실행 후 재시도하세요."
}

# Electron target (.npmrc)
$npmrc = Get-Content (Join-Path $vscode ".npmrc") -Raw
$disturl = if ($npmrc -match 'disturl="([^"]+)"') { $Matches[1] } else { "https://electronjs.org/headers" }
$target = if ($npmrc -match 'target="([^"]+)"') { $Matches[1] } else { throw "Electron target not found in .npmrc" }
Write-Host "Electron target: $target"

$gyp = Join-Path $vscode "build\npm\gyp\node_modules\.bin\node-gyp.cmd"
if (-not (Test-Path $gyp)) {
    Write-Host "node-gyp 설치 중 (build/npm/gyp)..."
    Push-Location (Join-Path $vscode "build\npm\gyp")
    & npm ci
    Pop-Location
}

function Show-SpectreHelp {
    Write-Host ""
    Write-Host "MSB8040 (Spectre-mitigated libraries) 오류로 네이티브 빌드가 실패했습니다." -ForegroundColor Yellow
    Write-Host "관리자 PowerShell에서 Spectre 구성 요소 설치 후 재시도하세요. (README 빌드 문제 해결 참고)"
    Write-Host ""
}

function Get-NativePackages {
    $packages = @()
    $vscodeDir = Join-Path $vscode "node_modules\@vscode"
    if (Test-Path $vscodeDir) {
        $packages += Get-ChildItem $vscodeDir -Directory | Where-Object { Test-Path (Join-Path $_.FullName "binding.gyp") } | ForEach-Object { "@vscode/$($_.Name)" }
    }
    $rootModules = Join-Path $vscode "node_modules"
    $extra = @('native-keymap', 'native-is-elevated', 'node-pty', 'windows-foreground-love', 'bufferutil', 'utf-8-validate', 'kerberos')
    foreach ($name in $extra) {
        if (Test-Path (Join-Path $rootModules "$name\binding.gyp")) { $packages += $name }
    }
    return $packages
}

function Get-PackageDir {
    param([string]$PackageName)
    if ($PackageName -like '@vscode/*') {
        return Join-Path $vscode "node_modules\$($PackageName -replace '/', '\')"
    }
    return Join-Path $vscode "node_modules\$PackageName"
}

function Test-NativeBuilt {
    param([string]$PackageName)
    $pkgDir = Get-PackageDir $PackageName
    $release = Join-Path $pkgDir "build\Release"
    if (Test-Path $release) {
        if ((Get-ChildItem $release -Filter "*.node" -ErrorAction SilentlyContinue).Count -gt 0) { return $true }
    }
    # native-keymap 등 일부 패키지는 Debug만 생성
    $debug = Join-Path $pkgDir "build\Debug"
    if (Test-Path $debug) {
        if ((Get-ChildItem $debug -Filter "*.node" -ErrorAction SilentlyContinue).Count -gt 0) { return $true }
    }
    return $false
}

function Build-NativePackage {
    param([string]$PackageName)
    $pkgDir = Get-PackageDir $PackageName
    if (-not (Test-Path $pkgDir)) {
        Write-Warning "skip $PackageName (not installed)"
        return $true
    }
    if (Test-NativeBuilt $PackageName) {
        Write-Host "$PackageName`: OK (cached)"
        return $true
    }
    Write-Host "$PackageName 빌드 중..."
    Push-Location $pkgDir
    $env:PATH = "$nodeDir;$env:PATH"
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & cmd /c "`"$gyp`" rebuild --dist-url=$disturl --target=$target" 2>&1 | Out-Null
    $gypExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEap
    $ok = ($gypExit -eq 0) -and (Test-NativeBuilt $PackageName)
    Pop-Location
    if ($ok) {
        Write-Host "$PackageName`: OK"
    } else {
        Write-Host "$PackageName`: FAILED" -ForegroundColor Red
    }
    return $ok
}

if ($FullCi) {
    Push-Location $vscode
    if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }
    $env:VSCODE_FORCE_INSTALL = "1"
    & npm ci
    Pop-Location
    Write-Host "npm ci 완료."
} else {
    $failed = @()
    foreach ($pkg in Get-NativePackages) {
        if (-not (Build-NativePackage $pkg)) { $failed += $pkg }
    }
    if ($failed.Count -gt 0) {
        Show-SpectreHelp
        Write-Host "실패: $($failed -join ', ')"
        exit 1
    }
}

Write-Host "다음: .\scripts\code.bat"
