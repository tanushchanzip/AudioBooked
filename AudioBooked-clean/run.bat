@echo off
title AudioBooked Studio
echo ========================================================
echo   Starting AudioBooked Studio - Kokoro Neural TTS
echo ========================================================

if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    python run_server.py
) else (
    python run_server.py
)
pause
