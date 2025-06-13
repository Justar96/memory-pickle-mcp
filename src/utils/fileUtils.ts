import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync, rmSync } from 'fs';

/**
 * Ensures that a directory exists, creating it if necessary.
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    // Ignore EEXIST error, which means directory already exists
    if (error.code !== 'EEXIST') {
      console.error('Error creating data directory:', error);
      throw error;
    }
  }
}

/**
 * Checks if a file exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a file lock for concurrent access safety.
 * This is a more robust implementation using fs/promises.
 */
export async function withFileLock<T>(
  lockPath: string,
  operation: () => Promise<T>,
  maxRetries: number = 20,
  retryDelay: number = 50
): Promise<T> {
  const lockFile = `${lockPath}.lock`;

  const acquireLock = async () => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // 'wx' flag fails if the file already exists (atomic operation)
        await fs.writeFile(lockFile, process.pid.toString(), { flag: 'wx' });
        return; // Lock acquired
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // Lock is held, wait and retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          throw error; // Other error
        }
      }
    }
    throw new Error(`Failed to acquire file lock for ${lockPath} after ${maxRetries} attempts.`);
  };

  const releaseLock = async () => {
    try {
      await fs.unlink(lockFile);
    } catch (error: any) {
      // Ignore ENOENT error, which means lock was already released
      if (error.code !== 'ENOENT') {
        console.error(`Error releasing file lock ${lockFile}:`, error);
      }
    }
  };
  
  // Ensure lock is released on process exit
  const cleanup = () => {
    if (existsSync(lockFile)) {
      rmSync(lockFile);
    }
  };
  
  const handleSignal = () => process.exit();
  
  process.once('exit', cleanup);
  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);

  await acquireLock();
  try {
    return await operation();
  } finally {
    await releaseLock();
    process.removeListener('exit', cleanup);
    process.removeListener('SIGINT', handleSignal);
    process.removeListener('SIGTERM', handleSignal);
  }
}