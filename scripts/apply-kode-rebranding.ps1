# VSCode upstream 소스에 Kode 리브랜딩 적용
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

Write-Host "Kode 리브랜딩 적용: $vscode"

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

# package.json 메타데이터 갱신
$pkgPath = Join-Path $vscode "package.json"
$pkgRaw = Get-Content $pkgPath -Raw -Encoding UTF8
$pkg = $pkgRaw | ConvertFrom-Json
$pkg.name = "kode-dev"
$pkg.PSObject.Properties.Remove("distro")
$pkg | Add-Member -NotePropertyName "repository" -NotePropertyValue @{
    type = "git"
    url  = "https://github.com/sly21/kode.git"
} -Force
$pkg | Add-Member -NotePropertyName "bugs" -NotePropertyValue @{
    url = "https://github.com/sly21/kode/issues"
} -Force
if ($pkg.author) {
    $pkg.author.name = "Kode"
}
$pkg | ConvertTo-Json -Depth 20 | Set-Content $pkgPath -Encoding UTF8
Write-Host "  package.json"

# 아이콘 placeholder (원본 code 자산 → kode 이름 복사)
$iconPairs = @(
    @("resources\win32\code.ico", "resources\win32\kode.ico"),
    @("resources\darwin\code.icns", "resources\darwin\kode.icns"),
    @("resources\linux\code.png", "resources\linux\kode.png"),
    @("resources\server\code-192.png", "resources\server\kode-192.png"),
    @("resources\server\code-512.png", "resources\server\kode-512.png")
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
    (Get-Content $devcontainer -Raw) -replace '"Code - OSS"', '"Kode"' | Set-Content $devcontainer -Encoding UTF8
    Write-Host "  .devcontainer/devcontainer.json"
}

Write-Host "Kode 리브랜딩 완료."
