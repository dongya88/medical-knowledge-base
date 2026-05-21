@echo off
title Content OS - 启动脚本
cd /d %~dp0

echo ========================================
echo   Content OS 启动中
echo ========================================
echo.

echo [1/3] 检查 Python Embedding 服务...
python -c "import flask; import FlagEmbedding" 2>nul
if errorlevel 1 (
    echo   需要安装依赖:
    echo   pip install -r requirements.txt
    echo.
    echo   如果没安装过:
    echo   pip install FlagEmbedding flask
    echo.
    pause
    exit /b 1
)

echo [2/3] 启动 Python Embedding 服务 (BGE-M3)...
start "Embedding Service" cmd /c "python embedding_service.py"

echo [3/3] 启动 Node.js 服务...
timeout /t 3 /nobreak >nul
node server.js

pause
