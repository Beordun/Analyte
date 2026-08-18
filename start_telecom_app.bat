@echo off
title Telecom RNO Drive Test AI Suite
cd /d "%~dp0"
echo =====================================================================
echo  TELECOM RNO DRIVE TEST HYBRID RAG & BENCHMARK ANALYTICS SUITE
echo =====================================================================
echo  Running on Built-in / Free LLM Engine
echo  Starting local server at http://localhost:8000 ...
echo =====================================================================
echo.
"C:\Program Files (x86)\TEMS\TEMS Investigation 27\Application\python.exe" server.py
pause
