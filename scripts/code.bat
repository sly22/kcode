@echo off
setlocal
set "ROOT=%~dp0"
set "VSCODE=%ROOT%..\vscode-main\vscode-main"
if not exist "%VSCODE%\scripts\code.bat" (
  echo VSCode source not found at %VSCODE%
  echo Run scripts\setup-vscode.ps1 and scripts\apply-kcode-rebranding.ps1 first.
  exit /b 1
)
call "%VSCODE%\scripts\code.bat" %*
