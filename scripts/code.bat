@echo off
setlocal
rem findstr 등 Windows 기본 도구 (Cursor/비표준 PATH 대응)
set "PATH=%SystemRoot%\System32;%PATH%"
set "ROOT=%~dp0"
set "VSCODE=%ROOT%..\vscode-main\vscode-main"
if not exist "%VSCODE%\scripts\code.bat" (
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
call "%VSCODE%\scripts\code.bat" %*
