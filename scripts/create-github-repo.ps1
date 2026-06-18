# GitHub 리포 생성 및 origin push
# 사용: .\scripts\create-github-repo.ps1 [-Owner ethegarden] [-Private]
param(
    [string]$Owner = "",
    [string]$RepoName = "kcode",
    [switch]$Private
)

$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

$ghExe = Join-Path ${env:ProgramFiles} 'GitHub CLI\gh.exe'
if (-not (Get-Command gh -ErrorAction SilentlyContinue) -and (Test-Path -LiteralPath $ghExe)) {
    $env:Path = "$(Split-Path -Parent $ghExe);$env:Path"
}

function Test-IsWindowsPlatform {
    if (Get-Variable -Name IsWindows -Scope Global -ErrorAction SilentlyContinue) {
        return [bool]$IsWindows
    }
    return ($env:OS -eq 'Windows_NT')
}

function Invoke-GhQuiet {
    param(
        [Parameter(Mandatory, ValueFromRemainingArguments = $true)]
        [string[]]$GhArgs
    )
    if (Test-IsWindowsPlatform) {
        $argLine = ($GhArgs | ForEach-Object {
            if ($_ -match '[\s"&|<>^]') {
                '"' + ($_.Replace('"', '""')) + '"'
            } else {
                $_
            }
        }) -join ' '
        cmd /c "gh $argLine >nul 2>&1"
        return $LASTEXITCODE
    }
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        & gh @GhArgs 2>$null | Out-Null
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prevEap
    }
}

function Invoke-GhOutput {
    param(
        [Parameter(Mandatory, ValueFromRemainingArguments = $true)]
        [string[]]$GhArgs
    )
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        $output = & gh @GhArgs 2>$null
        return @{
            ExitCode = $LASTEXITCODE
            Output   = ($output | Select-Object -First 1)
        }
    } finally {
        $ErrorActionPreference = $prevEap
    }
}

function Test-GhRepoExists {
    param(
        [string]$Owner,
        [string]$RepoName
    )
    $exitCode = Invoke-GhQuiet -GhArgs @('api', "repos/$Owner/$RepoName", '--silent')
    return ($exitCode -eq 0)
}

$root = Resolve-Path "$PSScriptRoot\.."
Push-Location $root

try {
    if ((Invoke-GhQuiet -GhArgs @('auth', 'status')) -ne 0) {
        Write-Host "GitHub 로그인이 필요합니다. 브라우저에서 인증을 완료하세요."
        gh auth login --hostname github.com --git-protocol https --web
        if ((Invoke-GhQuiet -GhArgs @('auth', 'status')) -ne 0) {
            throw "gh auth login did not complete successfully"
        }
    }

    if (-not $Owner) {
        $userResult = Invoke-GhOutput -GhArgs @('api', 'user', '--jq', '.login')
        if ($userResult.ExitCode -ne 0 -or -not $userResult.Output) {
            throw "Could not determine GitHub login (gh api user failed)"
        }
        $Owner = [string]$userResult.Output
        Write-Host "GitHub 계정: $Owner"
    }

    $visibility = if ($Private) { "--private" } else { "--public" }
    $fullName = "$Owner/$RepoName"

    if (-not (Test-GhRepoExists -Owner $Owner -RepoName $RepoName)) {
        Write-Host "리포 생성: $fullName"
        $prevEap = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            & gh repo create $RepoName --source=. --remote=origin $visibility --description "AI-native code editor based on VSCode (Kcode)"
        } finally {
            $ErrorActionPreference = $prevEap
        }
        if ($LASTEXITCODE -ne 0) {
            throw "gh repo create failed (exit $LASTEXITCODE)"
        }
    } else {
        Write-Host "리포가 이미 있습니다: https://github.com/$fullName"
        $prevEap = $ErrorActionPreference
        $ErrorActionPreference = 'SilentlyContinue'
        try {
            git remote get-url origin 2>$null | Out-Null
        } finally {
            $ErrorActionPreference = $prevEap
        }
        if ($LASTEXITCODE -ne 0) {
            git remote add origin "https://github.com/$fullName.git"
            if ($LASTEXITCODE -ne 0) {
                throw "git remote add failed (exit $LASTEXITCODE)"
            }
        }
    }

    git branch -M main
    if ($LASTEXITCODE -ne 0) {
        throw "git branch -M main failed (exit $LASTEXITCODE)"
    }

    git push -u origin main
    if ($LASTEXITCODE -ne 0) {
        throw "git push failed (exit $LASTEXITCODE)"
    }

    Write-Host "완료: https://github.com/$fullName"
} finally {
    Pop-Location
}
