@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0smoke-test.ps1"
pause
