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
 * Returns the current version string from the project's package.json.
 *
 * The version is cached after the first read to optimize repeated access.
 * @returns The version string from package.json.
 */
export function getVersion(): string {
  if (cachedVersion === null) {
    const packageJson = getPackageJson();
    cachedVersion = packageJson.version;
  }
  return cachedVersion!;
}

/**
 * Returns the parsed contents of the project's `package.json` file.
 *
 * The result is cached after the first read to improve performance on subsequent calls.
 *
 * @returns The parsed `package.json` object.
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
 * Returns the package name from the project's package.json file.
 *
 * @returns The value of the "name" field from package.json.
 */
export function getPackageName(): string {
  const packageJson = getPackageJson();
  return packageJson.name;
}

/**
 * Clears the cached version and package information.
 *
 * Use this to force a fresh read of `package.json` data, such as in testing scenarios.
 */
export function clearVersionCache(): void {
  cachedVersion = null;
  cachedPackageJson = null;
}
