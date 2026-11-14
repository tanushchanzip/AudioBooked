@echo off
title AudioBooked Setup
echo ========================================================
echo   Setting up AudioBooked Studio Environment
echo ========================================================

python -m venv venv
call venv\Scripts\activate.bat

echo [*] Upgrading pip...
python -m pip install --upgrade pip

echo [*] Installing PyTorch with CUDA acceleration...
python -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu124

echo [*] Installing remaining dependencies from requirements.txt...
python -m pip install -r requirements.txt

echo.
echo ========================================================
echo   Setup Complete! Launch using run.bat
echo ========================================================
pause
