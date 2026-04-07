#!/bin/bash

echo "=============================================================="
echo "NEXUS Incident Investigation Environment Setup"
echo "=============================================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 is not installed or not in PATH!"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm is not installed or not in PATH!"
    exit 1
fi

echo "[1/3] Setting up Backend Virtual Environment..."
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt

echo ""
echo "[2/3] Setting up Frontend Dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "[3/3] Validating OpenEnv Compliance..."
backend/venv/bin/python openenv_validator.py

echo ""
echo "=============================================================="
echo "SETUP COMPLETE!"
echo ""
echo "To run locally without Docker:"
echo "1. Start UI:    cd frontend && npm run dev"
echo "2. Start API:   cd backend && venv/bin/uvicorn main:app --reload"
echo "=============================================================="
