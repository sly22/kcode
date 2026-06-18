# VSCode upstream 소스에 Kcode 리브랜딩 적용
param(
    [string]$VscodeDir = "$PSScriptRoot\..\vscode-main\vscode-main"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."
$branding = Join-Path $root "branding"
$vscode = Resolve-Path $VscodeDir -ErrorAction SilentlyContinue

if (-not $vscode) {
    Write-Error "VSCode 소스가 없습니다: $VscodeDir`n먼저 .\scripts\setup-vscode.ps1 를 실행하세요."
}

Write-Host "Kcode 리브랜딩 적용: $vscode"

# product.json 교체
Copy-Item -Force (Join-Path $branding "product.json") (Join-Path $vscode "product.json")
Write-Host "  product.json"

# 오버라이드 파일 복사
$overrides = Join-Path $branding "overrides"
if (Test-Path $overrides) {
    Get-ChildItem -Path $overrides -Recurse -File | ForEach-Object {
        $relative = $_.FullName.Substring($overrides.Length + 1)
        $dest = Join-Path $vscode $relative
        $destDir = Split-Path $dest -Parent
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
        Copy-Item -Force $_.FullName $dest
        Write-Host "  $relative"
    }
}

# package.json 메타데이터 갱신 (Node로 포맷 유지)
$pkgPath = Join-Path $vscode "package.json"
node -e @"
const fs = require('fs');
const path = process.argv[1];
let raw = fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
const pkg = JSON.parse(raw);
pkg.name = 'kcode-dev';
delete pkg.distro;
pkg.author = { name: 'Kcode' };
pkg.repository = { type: 'git', url: 'https://github.com/sly22/kcode.git' };
pkg.bugs = { url: 'https://github.com/sly22/kcode/issues' };
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
"@ $pkgPath
Write-Host "  package.json"

# 아이콘 placeholder (원본 code 자산 → kcode 이름 복사)
$iconPairs = @(
    @("resources\win32\code.ico", "resources\win32\kcode.ico"),
    @("resources\darwin\code.icns", "resources\darwin\kcode.icns"),
    @("resources\linux\code.png", "resources\linux\kcode.png"),
    @("resources\server\code-192.png", "resources\server\kcode-192.png"),
    @("resources\server\code-512.png", "resources\server\kcode-512.png")
)
foreach ($pair in $iconPairs) {
    $src = Join-Path $vscode $pair[0]
    $dst = Join-Path $vscode $pair[1]
    if ((Test-Path $src) -and -not (Test-Path $dst)) {
        Copy-Item $src $dst
        Write-Host "  아이콘 placeholder: $($pair[1])"
    }
}

# .devcontainer 이름 갱신
$devcontainer = Join-Path $vscode ".devcontainer\devcontainer.json"
if (Test-Path $devcontainer) {
    (Get-Content $devcontainer -Raw) -replace '"Code - OSS"', '"Kcode"' | Set-Content $devcontainer -Encoding UTF8
    Write-Host "  .devcontainer/devcontainer.json"
}

# Kcode contrib 소스 복사 (kcode-src → vscode-main)
$kcodeSrc = Join-Path $root "kcode-src\src\vs\workbench\contrib\kcode"
$kcodeDest = Join-Path $vscode "src\vs\workbench\contrib\kcode"
if (Test-Path $kcodeSrc) {
    if (Test-Path $kcodeDest) { Remove-Item -Recurse -Force $kcodeDest }
    Copy-Item -Recurse -Force $kcodeSrc $kcodeDest
    $fileCount = (Get-ChildItem $kcodeSrc -Recurse -File).Count
    Write-Host "  kcode contrib ($fileCount files)"
}

# workbench.common.main.ts — Kcode contrib 등록 (// KCODE: 마커)
$wbMain = Join-Path $vscode "src\vs\workbench\workbench.common.main.ts"
if (Test-Path $wbMain) {
    $content = Get-Content $wbMain -Raw
    if ($content -notmatch 'KCODE: start - kcode contribution') {
        $anchor = "import './contrib/imageCarousel/browser/imageCarousel.contribution.js';"
        $insert = @"
$anchor

// KCODE: start - kcode contribution
import './contrib/kcode/browser/kcode.contribution.js';
// KCODE: end - kcode contribution
"@
        $content = $content.Replace($anchor, $insert)
        [System.IO.File]::WriteAllText($wbMain, $content)
        Write-Host "  workbench.common.main.ts (kcode contrib)"
    }
}

Write-Host "Kcode 리브랜딩 완료."
