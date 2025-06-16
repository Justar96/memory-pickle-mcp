#!/usr/bin/env node

/**
 * Automated version synchronization script
 * Updates version references in configuration files to match package.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Get version from package.json
const packageJsonPath = join(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const currentVersion = packageJson.version;

console.log(`🔄 Updating version references to ${currentVersion}...`);

// Files that need version updates
const filesToUpdate = [
  {
    path: 'mcp.json',
    pattern: /@cabbages-pre\/memory-pickle-mcp-pre@[\d.]+/g,
    replacement: `@cabbages-pre/memory-pickle-mcp-pre@${currentVersion}`
  },
  {
    path: 'clear-cache-and-test.bat',
    pattern: /@cabbages-pre\/memory-pickle-mcp-pre@[\d.]+/g,
    replacement: `@cabbages-pre/memory-pickle-mcp-pre@${currentVersion}`
  },
  {
    path: 'README.md',
    pattern: /Current: [\d.]+/g,
    replacement: `Current: ${currentVersion}`
  },
  {
    path: 'docs/TOOLS.md',
    pattern: /# Available Tools \(v[\d.]+\)/g,
    replacement: `# Available Tools (v${currentVersion})`
  },
  {
    path: 'docs/TOOLS.md',
    pattern: /## Summary of Changes in v[\d.]+/g,
    replacement: `## Summary of Changes in v${currentVersion}`
  },
  {
    path: 'INTEGRATION-GUIDE.md',
    pattern: /Memory Pickle MCP server v[\d.]+ running/g,
    replacement: `Memory Pickle MCP server v${currentVersion} running`
  }
];

let updatedFiles = 0;

for (const file of filesToUpdate) {
  const filePath = join(rootDir, file.path);
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const updatedContent = content.replace(file.pattern, file.replacement);
    
    if (content !== updatedContent) {
      writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`✅ Updated ${file.path}`);
      updatedFiles++;
    } else {
      console.log(`⏭️  No changes needed in ${file.path}`);
    }
  } catch (error) {
    console.warn(`⚠️  Could not update ${file.path}: ${error.message}`);
  }
}

console.log(`\n🎉 Version update complete! Updated ${updatedFiles} files to version ${currentVersion}`);
console.log(`\n💡 Note: Source code now uses getVersion() utility for automatic version sync.`);
