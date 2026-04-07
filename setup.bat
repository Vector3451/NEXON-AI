@echo off
echo ==============================================================
echo NEXUS Incident Investigation Environment Setup
echo ==============================================================
echo.

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    pause
    exit /b
)

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js/npm is not installed or not in PATH!
    pause
    exit /b
)

echo [1/3] Setting up Backend Virtual Environment...
python -m venv backend\venv
call backend\venv\Scripts\activate.bat
pip install -r backend\requirements.txt

echo.
echo [2/3] Setting up Frontend Dependencies...
cd frontend
call npm install
cd ..

echo.
echo [3/4] Pulling Required LLM Models (Ollama)...
echo --------------------------------------------------------------
echo This will ensure you have the correct models for the simulation.
echo 1. microsoft/Phi-3-mini-4k-instruct (Investigator)
echo 2. Qwen/Qwen2.5-1.5B-Instruct       (Validator)
echo 3. all-minilm                      (Reward Engine)
echo.
set /p PULL_MODELS="Do you want to pull these models now? (y/n): "
if /i "%PULL_MODELS%"=="y" (
    echo [Pulling Phi-3...]
    ollama pull phi3:mini
    echo [Pulling Qwen-1.5B...]
    ollama pull qwen2.5:1.5b
    echo [Pulling all-minilm...]
    ollama pull all-minilm
) else (
    echo Skipping model pull. Ensure you pull them manually later.
)

echo.
echo [4/4] Validating OpenEnv Compliance...
call backend\venv\Scripts\python.exe openenv_validator.py

echo.
echo ==============================================================
echo SETUP COMPLETE!
echo.
echo To run locally:
echo 1. Start UI:    cd frontend ^& npm run dev
echo 2. Start API:   cd backend ^& venv\Scripts\python main.py
echo ==============================================================
pause
