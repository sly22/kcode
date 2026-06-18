# GitHub 리포 생성 및 origin push
# 사용: .\scripts\create-github-repo.ps1 [-Owner ethegarden] [-Private]
param(
    [string]$Owner = "",
    [string]$RepoName = "kode",
    [switch]$Private
)

$ErrorActionPreference = "Stop"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

$root = Resolve-Path "$PSScriptRoot\.."
Push-Location $root

try {
    gh auth status 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "GitHub 로그인이 필요합니다. 브라우저에서 인증을 완료하세요."
        gh auth login --hostname github.com --git-protocol https --web
    }

    if (-not $Owner) {
        $Owner = gh api user --jq ".login"
        Write-Host "GitHub 계정: $Owner"
    }

    $visibility = if ($Private) { "--private" } else { "--public" }
    $fullName = "$Owner/$RepoName"

    gh repo view $fullName 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "리포 생성: $fullName"
        gh repo create $RepoName --source=. --remote=origin $visibility --description "AI-native code editor based on VSCode (Kode)"
    } else {
        Write-Host "리포가 이미 있습니다: https://github.com/$fullName"
        git remote get-url origin 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            git remote add origin "https://github.com/$fullName.git"
        }
    }

    git branch -M main
    git push -u origin main
    Write-Host "완료: https://github.com/$fullName"
} finally {
    Pop-Location
}
