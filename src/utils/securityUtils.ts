import path from 'path';
import fs from 'fs';

/**
 * Security utilities for safe file operations
 */

/**
 * Allowed file extensions for export operations
 */
const ALLOWED_EXPORT_EXTENSIONS = ['.md', '.txt', '.yaml', '.yml'];

/**
 * Maximum allowed filename length
 */
const MAX_FILENAME_LENGTH = 255;

/**
 * Validates and sanitizes a file path to prevent path traversal attacks
 * @param filePath - The file path to validate
 * @param baseDir - The base directory that the file should be contained within
 * @returns Sanitized file path or throws an error if invalid
 */
export function validateAndSanitizeFilePath(filePath: string, baseDir: string): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path provided');
  }

  // Remove any null bytes
  if (filePath.includes('\0')) {
    throw new Error('File path contains null bytes');
  }

  // Check for obvious path traversal attempts before path operations
  if (filePath.includes('..') || path.isAbsolute(filePath) || filePath.includes('/') || filePath.includes('\\')) {
    throw new Error('Path traversal attempt detected');
  }

  // Get just the filename component to prevent directory traversal
  const filename = path.basename(filePath);
  
  // Check filename length
  if (filename.length > MAX_FILENAME_LENGTH) {
    throw new Error(`Filename too long (max ${MAX_FILENAME_LENGTH} characters)`);
  }

  // Validate file extension for export operations first
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXPORT_EXTENSIONS.includes(ext)) {
    throw new Error(`Invalid file extension. Allowed extensions: ${ALLOWED_EXPORT_EXTENSIONS.join(', ')}`);
  }

  // Check for empty filename and edge cases (after we know extension is valid)
  if (!filename || filename === '.' || filename === '..' || filename.startsWith('.') && path.extname(filename) === filename) {
    throw new Error('Invalid filename');
  }

  // Check for dangerous characters (more restrictive)
  const dangerousChars = /[<>:"|?*\x00-\x1f\/\\]/;
  if (dangerousChars.test(filename)) {
    throw new Error('Filename contains dangerous characters');
  }

  // Construct safe path within base directory
  const safePath = path.join(baseDir, filename);
  
  // Verify the resolved path is still within the base directory
  const resolvedPath = path.resolve(safePath);
  const resolvedBaseDir = path.resolve(baseDir);
  
  if (!resolvedPath.startsWith(resolvedBaseDir + path.sep) && resolvedPath !== resolvedBaseDir) {
    throw new Error('Path traversal attempt detected');
  }

  return safePath;
}

/**
 * Validates export parameters for security
 * @param outputFile - The output file path
 * @param baseDir - The base directory for exports
 * @returns Validated and sanitized file path
 */
export function validateExportPath(outputFile: string, baseDir: string): string {
  try {
    return validateAndSanitizeFilePath(outputFile, baseDir);
  } catch (error) {
    throw new Error(`Export path validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Securely creates a temporary file path
 * @param baseDir - Base directory for the temp file
 * @param prefix - Optional prefix for the temp file
 * @returns Secure temporary file path
 */
export function createSecureTempPath(baseDir: string, prefix: string = 'tmp'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const filename = `${prefix}_${timestamp}_${random}.tmp`;
  
  // Validate the generated filename
  const safePath = path.join(baseDir, filename);
  const resolvedPath = path.resolve(safePath);
  const resolvedBaseDir = path.resolve(baseDir);
  
  if (!resolvedPath.startsWith(resolvedBaseDir + path.sep)) {
    throw new Error('Failed to create secure temporary path');
  }
  
  return safePath;
}

/**
 * Sets secure file permissions (owner read/write only)
 * @param filePath - Path to the file
 */
export async function setSecureFilePermissions(filePath: string): Promise<void> {
  try {
    // Set permissions to 0600 (owner read/write only)
    await fs.promises.chmod(filePath, 0o600);
  } catch (error) {
    console.error(`Failed to set secure permissions for ${filePath}:`, error);
    // Don't throw here as this is a hardening measure, not critical
  }
}

/**
 * Validates directory path for security
 * @param dirPath - Directory path to validate
 * @param baseDir - Base directory that should contain the target directory
 * @returns Validated directory path
 */
export function validateDirectoryPath(dirPath: string, baseDir: string): string {
  if (!dirPath || typeof dirPath !== 'string') {
    throw new Error('Invalid directory path provided');
  }

  // Resolve paths to check for traversal
  const resolvedDirPath = path.resolve(dirPath);
  const resolvedBaseDir = path.resolve(baseDir);
  
  if (!resolvedDirPath.startsWith(resolvedBaseDir + path.sep) && resolvedDirPath !== resolvedBaseDir) {
    throw new Error('Directory path traversal attempt detected');
  }

  return dirPath;
}