@echo off
echo Clearing NPX cache...
npm cache clean --force
npx clear-npx-cache

echo Testing latest version...
npx -y @cabbages-pre/memory-pickle-mcp-pre@1.3.8

pause
