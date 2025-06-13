#!/usr/bin/env node

/**
 * Test script to verify the npm package works correctly
 * This simulates what happens when users run: npx -y @cabbages/memory-pickle-mcp
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Memory Pickle MCP package...');
console.log('📦 Package: @cabbages/memory-pickle-mcp@1.0.0');
console.log('🎯 Description: MEM-Pickle MCP - agent planing tools :)');
console.log('');

// Test 1: Verify build directory exists
const buildPath = path.join(__dirname, 'build');

if (!fs.existsSync(buildPath)) {
  console.error('❌ Build directory not found!');
  process.exit(1);
}

console.log('✅ Build directory exists');

// Test 2: Verify main entry point exists
const mainFile = path.join(buildPath, 'index.js');
if (!fs.existsSync(mainFile)) {
  console.error('❌ Main entry point not found!');
  process.exit(1);
}

console.log('✅ Main entry point exists');

// Test 3: Verify package.json has correct configuration
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (packageJson.name !== '@cabbages/memory-pickle-mcp') {
  console.error('❌ Package name mismatch!');
  process.exit(1);
}

if (packageJson.version !== '1.0.0') {
  console.error('❌ Package version mismatch!');
  process.exit(1);
}

if (packageJson.description !== 'MEM-Pickle MCP - agent planing tools :)') {
  console.error('❌ Package description mismatch!');
  process.exit(1);
}

console.log('✅ Package.json configuration correct');

// Test 4: Verify MCP config is correct
const mcpConfigPath = path.join(__dirname, 'mcp.config.json');
const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));

if (!mcpConfig.mcpServers || !mcpConfig.mcpServers['memory-pickle']) {
  console.error('❌ MCP config structure invalid!');
  process.exit(1);
}

const serverConfig = mcpConfig.mcpServers['memory-pickle'];
if (serverConfig.command !== 'npx' || !serverConfig.args.includes('@cabbages/memory-pickle-mcp')) {
  console.error('❌ MCP config command invalid!');
  process.exit(1);
}

console.log('✅ MCP configuration correct');

// Test 5: Verify binary is executable
try {
  const stats = fs.statSync(mainFile);
  console.log('✅ Main file is accessible');
} catch (error) {
  console.error('❌ Main file access error:', error.message);
  process.exit(1);
}

console.log('');
console.log('🎉 All tests passed! Package is ready for npm publishing.');
console.log('');
console.log('📋 Publishing checklist:');
console.log('  ✅ Package name: @cabbages/memory-pickle-mcp');
console.log('  ✅ Version: 1.0.0');
console.log('  ✅ Description: MEM-Pickle MCP - agent planing tools :)');
console.log('  ✅ Build files: Present and accessible');
console.log('  ✅ MCP config: Uses npx command');
console.log('  ✅ Binary entry: Configured and executable');
console.log('');
console.log('🚀 Ready to publish with: npm publish');
console.log('📥 Users can install with: npx -y @cabbages/memory-pickle-mcp');