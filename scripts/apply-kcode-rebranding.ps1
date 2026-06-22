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
// KCODE: Copilot 미포함 — watch/compile 스크립트에서 제거
pkg.scripts.compile = 'npm run compile-client';
pkg.scripts.transpile = 'npm-run-all2 -lp transpile-client transpile-extensions';
pkg.scripts.watch = 'npm-run-all2 -lp watch-client-transpile watch-client watch-extensions';
pkg.scripts['watch-transpile'] = 'npm-run-all2 -lp watch-client-transpile watch-extensions';
for (const key of ['compile-copilot', 'watch-copilot', 'watch-copilotd', 'kill-watch-copilotd']) {
	delete pkg.scripts[key];
}
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
"@ $pkgPath
Write-Host "  package.json"

# GitHub Copilot 확장 비활성화 (extensions/copilot → 스캔 제외)
$copilotPkg = Join-Path $vscode "extensions\copilot\package.json"
$copilotDisabled = Join-Path $vscode "extensions\copilot\package.json.kcode-disabled"
if (Test-Path $copilotPkg) {
    if (-not (Test-Path $copilotDisabled)) {
        Move-Item -Force $copilotPkg $copilotDisabled
    }
    Write-Host "  extensions/copilot (disabled)"
}

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

# About 다이얼로그 — Kcode 부제 (// KCODE: 마커)
$aboutDialog = Join-Path $vscode "src\vs\workbench\browser\parts\dialogs\dialog.ts"
if (Test-Path $aboutDialog) {
    $content = Get-Content $aboutDialog -Raw
    if ($content -notmatch 'KCODE: start - about dialog title') {
        $old = "		title: productService.nameLong,"
        $new = @'
		// KCODE: start - about dialog title
		title: `${productService.nameLong} — AI Native Code Editor`,
		// KCODE: end - about dialog title
'@
        $content = $content.Replace($old, $new)
        [System.IO.File]::WriteAllText($aboutDialog, $content)
        Write-Host "  dialog.ts (about title)"
    }
}

# Welcome 페이지 — Copilot 문구를 Kcode로 치환 (// KCODE: 마커)
$gettingStarted = Join-Path $vscode "src\vs\workbench\contrib\welcomeGettingStarted\common\gettingStartedContent.ts"
if (Test-Path $gettingStarted) {
    $content = Get-Content $gettingStarted -Raw
    if ($content -notmatch 'KCODE: start - welcome rebrand') {
        $content = $content -replace '"Use AI features with Copilot for free"', '"Get started with Kcode AI — your AI-native editor"'
        $content = $content -replace 'You can use \[Copilot\]', 'You can use [Kcode AI]'
        $content = $content -replace 'Start to Chat', 'Open Kcode Chat'
        $content = $content -replace 'setupCopilotButton\.chatWithCopilot', 'setupKcodeButton.openChat'
        $content = $content -replace 'VS Code Copilot multi file edits', 'Kcode AI assistant'
        $content = $content -replace 'By continuing with \{0\} Copilot', 'By continuing with {0} Kcode AI'
        $content = $content -replace '\{0\} Copilot may show', '{0} Kcode AI may use external LLM providers. Configuration may show'
        $content = $content -replace 'GitHub Copilot', 'Kcode AI'
        $content = $content -replace 'copilot\.com', 'github.com/sly22/kcode'
        $marker = "export function copilotSettingsMessage"
        $content = $content.Replace($marker, "// KCODE: start - welcome rebrand`n$marker")
        [System.IO.File]::WriteAllText($gettingStarted, $content)
        Write-Host "  gettingStartedContent.ts (Kcode strings)"
    }
}

# 온보딩 Variation A — Kcode 환영 문구 (// KCODE: 마커)
$onboardingVariationA = Join-Path $vscode "src\vs\workbench\contrib\welcomeGettingStarted\browser\onboardingVariationA.ts"
if (Test-Path $onboardingVariationA) {
    $content = Get-Content $onboardingVariationA -Raw
    if ($content -notmatch 'KCODE: start - onboarding variation A') {
        $content = $content -replace 'Welcome to VS Code', 'Welcome to Kcode'
        $content = $content -replace 'Sign in to use GitHub Copilot\.', 'Configure your LLM provider in Kcode settings to use AI features.'
        $marker = "/*---------------------------------------------------------------------------------------------"
        if ($content.Contains($marker)) {
            $content = $content.Replace($marker, "// KCODE: start - onboarding variation A`n$marker")
        }
        [System.IO.File]::WriteAllText($onboardingVariationA, $content)
        Write-Host "  onboardingVariationA.ts (Kcode strings)"
    }
}

# Chat setup — Copilot 로그인/설정 문구를 Kcode로 (// KCODE: 마커)
$chatSetupRunner = Join-Path $vscode "src\vs\workbench\contrib\chat\browser\chatSetup\chatSetupRunner.ts"
if (Test-Path $chatSetupRunner) {
    $content = Get-Content $chatSetupRunner -Raw
    if ($content -notmatch 'KCODE: start - chat setup rebrand') {
        $content = $content -replace 'Sign in to use GitHub Copilot', 'Configure Kcode AI'
        $content = $content -replace '\{3\} Copilot may show', '{3} Kcode AI may use'
        $marker = "/*---------------------------------------------------------------------------------------------"
        if ($content.Contains($marker)) {
            $content = $content.Replace($marker, "// KCODE: start - chat setup rebrand`n$marker")
        }
        [System.IO.File]::WriteAllText($chatSetupRunner, $content)
        Write-Host "  chatSetupRunner.ts (Kcode strings)"
    }
}

# Fallback — src 내 "Welcome to VS Code" 잔여 문자열 일괄 치환
$welcomeFiles = Get-ChildItem -Path (Join-Path $vscode "src") -Recurse -Include *.ts,*.tsx -File -ErrorAction SilentlyContinue |
    Where-Object { (Get-Content $_.FullName -Raw) -match 'Welcome to VS Code' }
foreach ($file in $welcomeFiles) {
    $content = Get-Content $file.FullName -Raw
    if ($content -notmatch 'KCODE: welcome rebrand applied') {
        $content = $content -replace 'Welcome to VS Code', 'Welcome to Kcode'
        $content = "// KCODE: welcome rebrand applied`n" + $content
        [System.IO.File]::WriteAllText($file.FullName, $content)
        $rel = $file.FullName.Substring($vscode.Path.Length + 1)
        Write-Host "  $rel (Welcome to Kcode)"
    }
}

# Copilot CLI sessions — product.json sessionsWindowAllowedExtensions: [] 로 비활성화됨 (branding/product.json)

# codicon.ttf — UI 아이콘 폰트 (transpile-client만 실행 시 out/에 누락됨)
$codiconNpm = Join-Path $vscode "node_modules\@vscode\codicons\dist\codicon.ttf"
if (Test-Path $codiconNpm) {
    foreach ($rel in @(
        "src\vs\base\browser\ui\codicons\codicon\codicon.ttf",
        "out\vs\base\browser\ui\codicons\codicon\codicon.ttf"
    )) {
        $dest = Join-Path $vscode $rel
        $destDir = Split-Path $dest -Parent
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
        Copy-Item -Force $codiconNpm $dest
    }
    Write-Host "  codicon.ttf (src + out)"
}

Write-Host "Kcode 리브랜딩 완료."
