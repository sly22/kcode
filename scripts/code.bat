@echo off
setlocal EnableDelayedExpansion
rem === Kcode launcher v2 (repo root only — vscode-main\scripts\code.bat 사용 금지) ===
echo [Kcode] scripts\code.bat
set "PATH=%SystemRoot%\System32;%PATH%"
set "ROOT=%~dp0"
set "VSCODE=%ROOT%..\vscode-main\vscode-main"
if not exist "%VSCODE%\product.json" (
  echo VSCode source not found at %VSCODE%
  echo Run scripts\setup-vscode.ps1 and scripts\apply-kcode-rebranding.ps1 first.
  exit /b 1
)
rem codicon UI font (missing after transpile-only builds)
set "CODICON_NPM=%VSCODE%\node_modules\@vscode\codicons\dist\codicon.ttf"
set "CODICON_OUT=%VSCODE%\out\vs\base\browser\ui\codicons\codicon\codicon.ttf"
if exist "%CODICON_NPM%" if not exist "%CODICON_OUT%" (
  if not exist "%VSCODE%\out\vs\base\browser\ui\codicons\codicon" mkdir "%VSCODE%\out\vs\base\browser\ui\codicons\codicon"
  copy /Y "%CODICON_NPM%" "%CODICON_OUT%" >nul
)
rem GitHub Copilot 미포함 (upstream extensions/copilot 잔존 시 스킵)
if not defined VSCODE_SKIP_BUILTIN_EXTENSIONS set "VSCODE_SKIP_BUILTIN_EXTENSIONS=GitHub.copilot-chat,GitHub.copilot"
rem extension node_modules 누락 시 자동 복구 (emmet, github-authentication 등)
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%ensure-extension-deps.ps1" -Quiet
if errorlevel 1 (
  echo Extension dependency install failed. Run: cd vscode-main\vscode-main ^&^& npm ci
  exit /b 1
)

rem --- Kcode.exe 경로 (upstream findstr/nameShort 파싱 우회) ---
set "KCODE_EXE=%VSCODE%\.build\electron\Kcode.exe"
if not exist "!KCODE_EXE!" call :resolve_kcode_exe

rem --- EBUSY: 실행 중 electron 재빌드 시 default_app.asar 잠금 ---
set "KCODE_RUNNING=0"
tasklist /FI "IMAGENAME eq Kcode.exe" 2>nul | find /I "Kcode.exe" >nul && set "KCODE_RUNNING=1"
if "!KCODE_RUNNING!"=="1" (
  echo [Kcode] Kcode.exe is already running.
  echo          Close Kcode first to allow a full electron rebuild, OR
  echo          set VSCODE_SKIP_PRELAUNCH=1 to skip rebuild ^(auto-set when exe exists^).
)
if exist "!KCODE_EXE!" if not defined VSCODE_SKIP_PRELAUNCH set "VSCODE_SKIP_PRELAUNCH=1"
if "!KCODE_RUNNING!"=="1" if not defined VSCODE_SKIP_PRELAUNCH set "VSCODE_SKIP_PRELAUNCH=1"

rem --- preLaunch: electron 바이너리 없을 때만 (VSCODE_SKIP_PRELAUNCH=1 이면 스킵) ---
if not exist "!KCODE_EXE!" if not "!VSCODE_SKIP_PRELAUNCH!"=="1" (
  pushd "%VSCODE%"
  node build/lib/preLaunch.ts
  set "PRELAUNCH_ERR=!errorlevel!"
  popd
  if !PRELAUNCH_ERR! neq 0 (
    echo.
    echo [Kcode] Electron preLaunch failed ^(often EBUSY: Kcode still running^).
    echo         Run: powershell -File scripts\kill-kcode.ps1
    echo         Then: .\scripts\code.bat
    exit /b !PRELAUNCH_ERR!
  )
  call :resolve_kcode_exe
)

if not exist "!KCODE_EXE!" (
  echo Kcode executable not found: !KCODE_EXE!
  echo Run: cd vscode-main\vscode-main ^&^& npm run electron
  exit /b 1
)

rem --- 직접 실행 (upstream code.bat 따옴표 파싱 오류 우회) ---
pushd "%VSCODE%"

if "%~1"=="--builtin" (
  "!KCODE_EXE!" build/builtin
  set "LAUNCH_ERR=!errorlevel!"
  popd
  exit /b !LAUNCH_ERR!
)

set NODE_ENV=development
set VSCODE_DEV=1
set VSCODE_CLI=1
set ELECTRON_ENABLE_LOGGING=1
set ELECTRON_ENABLE_STACK_DUMPING=1

set "DISABLE_TEST_EXTENSION=--disable-extension=vscode.vscode-api-tests"
for %%A in (%*) do (
  if "%%~A"=="--extensionTestsPath" set "DISABLE_TEST_EXTENSION="
)

"!KCODE_EXE!" . !DISABLE_TEST_EXTENSION! %*
set "LAUNCH_ERR=!errorlevel!"
popd
exit /b !LAUNCH_ERR!

:resolve_kcode_exe
pushd "%VSCODE%"
for /f "delims=" %%a in ('node -e "console.log(require('./product.json').nameShort+'.exe')" 2^>nul') do (
  set "KCODE_EXE=%VSCODE%\.build\electron\%%a"
)
popd
exit /b 0
