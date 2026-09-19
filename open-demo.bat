@echo off
title Hotel 3 - Operations System
cd /d "%~dp0"
start "" "http://localhost:8080/"
node server.js
