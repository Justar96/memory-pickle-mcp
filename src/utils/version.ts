/**
 * Centralized version management utility
 * Single source of truth for version information
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cache the version to avoid repeated file reads
let cachedVersion: string | null = null;
let cachedPackageJson: any = null;

/**
 * Get the current version from package.json
 * Cached for performance
 */
export function getVersion(): string {
  if (cachedVersion === null) {
    const packageJson = getPackageJson();
    cachedVersion = packageJson.version;
  }
  return cachedVersion!;
}

/**
 * Get the full package.json content
 * Cached for performance
 */
export function getPackageJson(): any {
  if (cachedPackageJson === null) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJsonPath = join(__dirname, '../../package.json');
    cachedPackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  }
  return cachedPackageJson;
}

/**
 * Get package name from package.json
 */
export function getPackageName(): string {
  const packageJson = getPackageJson();
  return packageJson.name;
}

/**
 * Clear the cache (useful for testing)
 */
export function clearVersionCache(): void {
  cachedVersion = null;
  cachedPackageJson = null;
}
