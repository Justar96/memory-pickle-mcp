#!/usr/bin/env node

/**
 * Setup script for Memory Pickle MCP Server
 * This script helps configure the MCP server in your settings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MCP_SETTINGS_PATH = path.join(
  process.env.APPDATA || process.env.HOME,
  'Code/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json'
);

const SERVER_PATH = path.join(__dirname, 'build', 'index.js');

const MEMORY_PICKLE_CONFIG = {
  "memory-pickle": {
    "command": "node",
    "args": [SERVER_PATH],
    "disabled": false,
    "alwaysAllow": [
      "remember_this",
      "recall_context", 
      "list_categories"
    ],
    "env": {
      "NODE_ENV": "production"
    },
    "timeout": 30,
    "description": "Memory Pickle - Persistent memory system for AI agents with code analysis"
  }
};

function setupMCP() {
  try {
    console.log('🔧 Setting up Memory Pickle MCP Server...\n');
    
    // Check if MCP settings file exists
    if (!fs.existsSync(MCP_SETTINGS_PATH)) {
      console.error('❌ MCP settings file not found at:', MCP_SETTINGS_PATH);
      console.log('Please ensure Cabbages Code is installed and configured.');
      process.exit(1);
    }
    
    // Read current settings
    const settingsContent = fs.readFileSync(MCP_SETTINGS_PATH, 'utf8');
    const settings = JSON.parse(settingsContent);
    
    // Ensure mcpServers object exists
    if (!settings.mcpServers) {
      settings.mcpServers = {};
    }
    
    // Add or update memory-pickle server
    settings.mcpServers = {
      ...settings.mcpServers,
      ...MEMORY_PICKLE_CONFIG
    };
    
    // Write back to file
    fs.writeFileSync(MCP_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
    
    console.log('✅ Memory Pickle MCP Server configured successfully!');
    console.log('\n📋 Configuration added:');
    console.log(JSON.stringify(MEMORY_PICKLE_CONFIG, null, 2));
    
    console.log('\n🚀 Next steps:');
    console.log('1. Restart your AI assistant to load the new server');
    console.log('2. Try using: list_categories');
    console.log('3. Store your first memory with: remember_this');
    console.log('4. Check the README.md for detailed usage examples');
    
  } catch (error) {
    console.error('❌ Error setting up MCP server:', error.message);
    process.exit(1);
  }
}

function showStatus() {
  try {
    if (!fs.existsSync(MCP_SETTINGS_PATH)) {
      console.log('❌ MCP settings file not found');
      return;
    }
    
    const settings = JSON.parse(fs.readFileSync(MCP_SETTINGS_PATH, 'utf8'));
    
    if (settings.mcpServers && settings.mcpServers['memory-pickle']) {
      console.log('✅ Memory Pickle MCP Server is configured');
      console.log('Server status:', settings.mcpServers['memory-pickle'].disabled ? 'Disabled' : 'Enabled');
    } else {
      console.log('❌ Memory Pickle MCP Server is not configured');
    }
    
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'setup':
  case undefined:
    setupMCP();
    break;
  case 'status':
    showStatus();
    break;
  case 'help':
    console.log(`
Memory Pickle MCP Setup

Usage:
  node setup-mcp.js [command]

Commands:
  setup     Configure the MCP server (default)
  status    Check if server is configured
  help      Show this help message

Examples:
  node setup-mcp.js
  node setup-mcp.js status
`);
    break;
  default:
    console.error('❌ Unknown command:', command);
    console.log('Use "node setup-mcp.js help" for usage information');
    process.exit(1);
}