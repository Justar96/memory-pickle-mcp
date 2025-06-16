# Version Management

This document explains how version management works in the memory-pickle-mcp project.

## Single Source of Truth

**package.json** is the single source of truth for version information. All other version references are automatically synchronized.

## Automated Version Management

### Source Code
All TypeScript/JavaScript code uses the centralized version utility:

```typescript
import { getVersion } from '../utils/version.js';

const version = getVersion(); // Always returns current package.json version
```

### Configuration Files
Configuration files are automatically updated using the version sync script:

```bash
npm run update-version
```

## Version Update Workflow

### 1. Update Package Version
Use npm to update the version (single command):

```bash
# Patch version (1.3.8 → 1.3.9)
npm version patch

# Minor version (1.3.8 → 1.4.0)
npm version minor

# Major version (1.3.8 → 2.0.0)
npm version major

# Specific version
npm version 1.4.0
```

### 2. Automatic Synchronization
The `npm version` command automatically:
- Updates package.json and package-lock.json
- Runs `npm run update-version` (via the "version" script)
- Updates all configuration files
- Stages changes for git commit

### 3. Manual Sync (if needed)
If you need to manually sync version references:

```bash
npm run update-version
```

## Files Managed Automatically

### Source Code (Dynamic)
These files read version from package.json at runtime:
- `src/config/constants.ts`
- `src/server/ServerConfig.ts`
- `src/services/InMemoryStore.ts`

### Configuration Files (Static)
These files are updated by the sync script:
- `mcp.json`
- `clear-cache-and-test.bat`
- `README.md`
- `docs/TOOLS.md`
- `INTEGRATION-GUIDE.md`

### Documentation Files (Manual)
These files require manual updates:
- `docs/CHANGELOG.md` (add new version entries)
- Version-specific documentation sections

## Benefits

1. **Single Source of Truth**: package.json is the only place to update version
2. **No Duplication**: Source code reads version dynamically
3. **Automated Sync**: Configuration files updated automatically
4. **Git Integration**: Version updates are automatically staged
5. **Error Prevention**: Eliminates version mismatch issues

## Version Utility API

The `src/utils/version.ts` module provides:

```typescript
// Get current version
getVersion(): string

// Get full package.json content
getPackageJson(): any

// Get package name
getPackageName(): string

// Clear cache (for testing)
clearVersionCache(): void
```

## Testing Version Management

```bash
# Test that version is read correctly
node -e "import('./build/utils/version.js').then(m => console.log('Version:', m.getVersion()))"

# Test version sync script
npm run update-version

# Test full version update workflow
npm version patch --no-git-tag-version
npm run update-version
```

## Migration from Manual Version Management

The old approach required updating version in multiple files:
- ❌ `package.json` (manual)
- ❌ `src/config/constants.ts` (manual)
- ❌ `src/server/ServerConfig.ts` (manual)
- ❌ `mcp.json` (manual)
- ❌ `README.md` (manual)
- ❌ Documentation files (manual)

The new approach requires only one command:
- ✅ `npm version patch` (automatic sync)

## Troubleshooting

### Version Mismatch Issues
If you see version mismatches:

```bash
# Rebuild to ensure latest version utility
npm run build

# Sync all configuration files
npm run update-version

# Verify version is correct
node -e "import('./build/utils/version.js').then(m => console.log('Version:', m.getVersion()))"
```

### Cache Issues
The version utility caches the package.json content for performance. In tests, you can clear the cache:

```typescript
import { clearVersionCache } from '../src/utils/version.js';
clearVersionCache();
```
