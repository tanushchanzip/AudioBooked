@echo off
setlocal
cd /d "%~dp0"
echo Starting AudioBooked Lightweight Desktop App...
start "" "%~dp0venv\Scripts\pythonw.exe" "%~dp0app_desktop.py"
exit
