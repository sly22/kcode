# .nvmrc(24.15.0) 포터블 Node PATH 설정 — 현재 세션용
$root = Resolve-Path "$PSScriptRoot\.."
$nodeDir = Join-Path $root ".tools\node-v24.15.0-win-x64"

if (-not (Test-Path (Join-Path $nodeDir "node.exe"))) {
    Write-Host "포터블 Node가 없습니다. 다운로드 중..."
    & (Join-Path $PSScriptRoot "rebuild-native.ps1") 2>$null
    if (-not (Test-Path (Join-Path $nodeDir "node.exe"))) {
        $tools = Join-Path $root ".tools"
        New-Item -ItemType Directory -Force -Path $tools | Out-Null
        $zip = Join-Path $tools "node-v24.15.0-win-x64.zip"
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v24.15.0/node-v24.15.0-win-x64.zip" -OutFile $zip
        Expand-Archive -Path $zip -DestinationPath $tools -Force
        Remove-Item $zip
    }
}

$env:PATH = "$nodeDir;$env:PATH"
Write-Host "Node $(node -v) — PATH에 $nodeDir 추가됨 (현재 세션)"
Write-Host "영구 사용: fnm install 24.15.0 && fnm use 24.15.0"
