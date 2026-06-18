# VSCode upstream 소스 clone 및 upstream remote 설정
param(
    [string]$TargetDir = "$PSScriptRoot\..\vscode-main\vscode-main"
)

$ErrorActionPreference = "Stop"
$vscodeUrl = "https://github.com/microsoft/vscode.git"

if (Test-Path "$TargetDir\.git") {
    Write-Host "VSCode 소스가 이미 있습니다: $TargetDir"
    Push-Location $TargetDir
    git remote get-url upstream 2>$null
    if ($LASTEXITCODE -ne 0) {
        git remote add upstream $vscodeUrl
        Write-Host "upstream remote 추가됨"
    }
    Pop-Location
    & "$PSScriptRoot\apply-kode-rebranding.ps1" -VscodeDir $TargetDir
    exit 0
}

New-Item -ItemType Directory -Force -Path (Split-Path $TargetDir) | Out-Null
Write-Host "Cloning VSCode into $TargetDir ..."
git clone $vscodeUrl $TargetDir
Push-Location $TargetDir
git remote rename origin upstream
Write-Host "완료. upstream = $vscodeUrl"
Pop-Location

& "$PSScriptRoot\apply-kode-rebranding.ps1" -VscodeDir $TargetDir
