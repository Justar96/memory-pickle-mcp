import { USE_EMOJIS } from '../config/constants.js';

/**
 * Utility for conditional emoji usage based on configuration
 */
export function emoji(emojiChar: string, fallback: string = ''): string {
  return USE_EMOJIS ? emojiChar : fallback;
}

/**
 * Common emoji mappings with text alternatives
 */
export const EMOJIS = {
  // Task status
  COMPLETED: emoji('✅', '[DONE]'),
  PENDING: emoji('⬜', '[ ]'),
  
  // Project status  
  PROJECT_STATUS: emoji('📊', '##'),
  TASK_LIST: emoji('📋', '##'),
  BLOCKED: emoji('🚨', '##'),
  CRITICAL: emoji('⚡', '##'),
  MEMORY: emoji('🧠', '##'),
  
  // General
  SUCCESS: emoji('✅', '[OK]'),
  ERROR: emoji('❌', '[ERROR]'),
  INFO: emoji('💡', '[INFO]'),
} as const;

/**
 * Format task checkbox with optional emoji
 */
export function taskCheckbox(completed: boolean): string {
  return completed ? EMOJIS.COMPLETED : EMOJIS.PENDING;
}

/**
 * Format section header with optional emoji
 */
export function sectionHeader(title: string, emojiChar: string): string {
  return USE_EMOJIS ? `${emojiChar} ${title}` : `## ${title}`;
}