/**
 * Minimal constants for in-memory operation
 * All file system dependencies removed for pure in-memory mode
 */

// Server configuration
export const SERVER_CONFIG = {
  name: "memory-pickle",
  version: "1.3.6",
} as const;

// YAML serialization options (kept for backward compatibility)
export const YAML_OPTIONS = {
  indent: 2,
  lineWidth: 120,
  noRefs: true,
} as const;