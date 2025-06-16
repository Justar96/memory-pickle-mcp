/**
 * Minimal constants for in-memory operation
 * All file system dependencies removed for pure in-memory mode
 */

import { getVersion } from '../utils/version.js';

// Server configuration
export const SERVER_CONFIG = {
  name: "memory-pickle",
  version: getVersion(),
} as const;