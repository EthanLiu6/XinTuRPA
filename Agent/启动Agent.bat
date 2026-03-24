@echo off
chcp 65001 >nul
title Agent需求分析系统

echo ========================================
echo   Agent 需求分析系统 - 启动器
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] 正在安装依赖...
call npm install

echo [2/2] 正在启动服务器...
echo.
echo ========================================
echo   访问地址: http://localhost:5174
echo   API地址:  http://localhost:3001
echo ========================================
echo.
echo 按 Ctrl+C 停止服务
echo.

npm run server
