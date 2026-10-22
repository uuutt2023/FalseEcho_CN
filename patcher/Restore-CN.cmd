@echo off
chcp 65001 >nul
cd /d "%~dp0"
title False Echo - Restore Original Files
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Patch-FalseEcho-CN.ps1" -Action restore
echo.
echo Press any key to close...
pause >nul
