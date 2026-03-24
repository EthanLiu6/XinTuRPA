@echo off
chcp 65001 >nul
title 星图达人RPA系统

echo ========================================
echo   星图达人RPA系统 - 启动器
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] 正在启动 Agent 需求分析系统...
start "Agent-API" cmd /k "cd Agent && node src/server.js"

timeout /t 2 /nobreak >nul

echo [2/2] 正在启动 XinTuRPA 达人搜索系统...
start "XinTuRPA-API" cmd /k "node src/server.js"

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   启动完成！
echo ========================================
echo.
echo   Agent 系统:      http://localhost:5174
echo   XinTuRPA 系统:   http://localhost:5173
echo.
echo   注意：如果页面打不开，请运行 npm run build 构建前端
echo.
echo   按任意键打开浏览器...
pause >nul

start http://localhost:5174
start http://localhost:5173

echo.
echo 已在新窗口中打开浏览器
echo 按 Ctrl+C 停止服务
pause
