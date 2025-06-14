import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync, rmSync, readFileSync } from 'fs';
import crypto from 'crypto';
import * as os from 'os';

/**
 * Ensures that a directory exists, creating it if necessary.
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true, mode: 0o700 }); // Secure permissions: owner only
  } catch (error: any) {
    // Only ignore EEXIST error
    if (error.code !== 'EEXIST') {
      console.error('Error creating data directory:', error);
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
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
 * Enhanced file lock metadata
 */
interface LockInfo {
  pid: number;
  timestamp: number;
  token: string;
  hostname: string;
}

/**
 * Creates a secure file lock for concurrent access safety.
 * Enhanced with stale lock detection, secure tokens, and proper cleanup.
 */
export async function withFileLock<T>(
  lockPath: string,
  operation: () => Promise<T>,
  maxRetries: number = 20,
  retryDelay: number = 50,
  staleLockTimeout: number = 30000 // 30 seconds
): Promise<T> {
  const lockFile = `${lockPath}.lock`;
  const lockToken = crypto.randomBytes(16).toString('hex');
  const hostname = os.hostname();

  const createLockInfo = (): LockInfo => ({
    pid: process.pid,
    timestamp: Date.now(),
    token: lockToken,
    hostname: hostname
  });

  const isStale = async (lockInfo: LockInfo): Promise<boolean> => {
    const age = Date.now() - lockInfo.timestamp;
    if (age > staleLockTimeout) {
      // Check if process is still running
      try {
        // process.kill with signal 0 checks if process exists without killing it
        process.kill(lockInfo.pid, 0);
        return false; // Process exists, lock is not stale
      } catch (error: any) {
        if (error.code === 'ESRCH') {
          return true; // Process doesn't exist, lock is stale
        }
        return false; // Other error, assume process exists
      }
    }
    return false;
  };

  const acquireLock = async () => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const lockInfo = createLockInfo();
        // Use mode 0o600 for secure permissions (owner read/write only)
        // 'wx' flag fails if the file already exists (atomic operation)
        await fs.writeFile(lockFile, JSON.stringify(lockInfo, null, 2), { 
          flag: 'wx', 
          mode: 0o600 
        });
        return; // Lock acquired
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // Lock exists, check if it's stale
          try {
            const lockContent = await fs.readFile(lockFile, 'utf8');
            const existingLock: LockInfo = JSON.parse(lockContent);
            
            if (await isStale(existingLock)) {
              console.warn(`Removing stale lock file: ${lockFile}`);
              await fs.unlink(lockFile);
              continue; // Try again
            }
          } catch (parseError) {
            // Lock file is corrupted, try to remove it
            console.warn(`Removing corrupted lock file: ${lockFile}`);
            try {
              await fs.unlink(lockFile);
              continue; // Try again
            } catch (unlinkError) {
              // Cannot remove lock file, wait and retry
            }
          }
          
          // Lock is held by active process, wait and retry
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
      // Verify we still own the lock before releasing
      const lockContent = await fs.readFile(lockFile, 'utf8');
      const lockInfo: LockInfo = JSON.parse(lockContent);

      if (lockInfo.token === lockToken && lockInfo.pid === process.pid) {
        await fs.unlink(lockFile);
      } else {
        console.warn(`Lock file ${lockFile} was acquired by another process, not removing`);
      }
    } catch (error: any) {
      // Ignore ENOENT error, which means lock was already released
      if (error.code !== 'ENOENT') {
        console.error(`Error releasing file lock ${lockFile}:`, error);
      }
    }
  };
  
  // Enhanced cleanup with verification
  const cleanup = () => {
    try {
      if (existsSync(lockFile)) {
        const lockContent = readFileSync(lockFile, 'utf8');
        const lockInfo: LockInfo = JSON.parse(lockContent);
        
        // Only remove if we own the lock
        if (lockInfo.token === lockToken && lockInfo.pid === process.pid) {
          rmSync(lockFile);
        }
      }
    } catch (error) {
      // Silent cleanup failure - don't prevent exit
    }
  };
  
  const handleSignal = () => {
    cleanup();
    process.exit();
  };
  
  // Add listeners
  process.once('exit', cleanup);
  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);

  try {
    await acquireLock();
    try {
      return await operation();
    } finally {
      await releaseLock();
    }
  } finally {
    // ALWAYS remove listeners, even if operation fails
    process.removeListener('exit', cleanup);
    process.removeListener('SIGINT', handleSignal);
    process.removeListener('SIGTERM', handleSignal);
  }
}