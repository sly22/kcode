# Kcode/Electron 프로세스 종료 + (가능하면) .build/electron 정리
$ErrorActionPreference = "SilentlyContinue"
$electronDir = Join-Path $PSScriptRoot "..\vscode-main\vscode-main\.build\electron" | Resolve-Path -ErrorAction SilentlyContinue

Write-Host "Stopping Kcode.exe..."
taskkill /IM Kcode.exe /F 2>$null | Out-Null

# mycode electron 빌드만 (Cursor Code.exe는 건드리지 않음)
Get-CimInstance Win32_Process -Filter "Name='Kcode.exe'" | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

if ($electronDir) {
    $asar = Join-Path $electronDir "resources\default_app.asar"
    if (Test-Path $asar) {
        try {
            Rename-Item $asar "$asar.old" -Force
            Write-Host "Renamed locked default_app.asar"
        } catch {
            Write-Host "default_app.asar still locked. Close all Kcode windows and retry, or reboot." -ForegroundColor Yellow
        }
    }
}

Write-Host "Done. Next: cd c:\project\mycode && .\scripts\code.bat"
