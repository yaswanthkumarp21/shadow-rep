@echo off
rem Stops everything WITHOUT deleting any data. (Do not use "docker compose down -v".)
cd /d "%~dp0.."              && docker compose stop
cd /d "%~dp0..\apps\food"   && docker compose stop
cd /d "%~dp0..\apps\gym"      && docker compose stop
echo.
echo Stopped. Your data is untouched. Run start-all.bat to start again.
pause
