/**
 * Comprehensive tests for ValidationUtils covering all functionality
 */

import { ValidationUtils } from '../src/utils/ValidationUtils.js';

describe('ValidationUtils - Complete Coverage', () => {
  describe('sanitizeString', () => {
    test('should handle normal strings', () => {
      expect(ValidationUtils.sanitizeString('hello world')).toBe('hello world');
      expect(ValidationUtils.sanitizeString('Test Project')).toBe('Test Project');
    });

    test('should handle null and undefined', () => {
      expect(ValidationUtils.sanitizeString(null)).toBe('');
      expect(ValidationUtils.sanitizeString(undefined)).toBe('');
    });

    test('should handle empty strings', () => {
      expect(ValidationUtils.sanitizeString('')).toBe('');
      expect(ValidationUtils.sanitizeString('   ')).toBe('');
    });

    test('should trim whitespace', () => {
      expect(ValidationUtils.sanitizeString('  hello  ')).toBe('hello');
      expect(ValidationUtils.sanitizeString('\n\ttest\n\t')).toBe('test');
    });

    test('should handle non-string inputs', () => {
      expect(ValidationUtils.sanitizeString(123 as any)).toBe('123');
      expect(ValidationUtils.sanitizeString(true as any)).toBe('true');
      expect(ValidationUtils.sanitizeString(false as any)).toBe('false');
      expect(ValidationUtils.sanitizeString({} as any)).toBe('[object Object]');
    });

    test('should handle special characters', () => {
      expect(ValidationUtils.sanitizeString('hello@world.com')).toBe('hello@world.com');
      expect(ValidationUtils.sanitizeString('test-project_v2')).toBe('test-project_v2');
    });
  });

  describe('sanitizeId', () => {
    test('should handle normal IDs', () => {
      expect(ValidationUtils.sanitizeId('project_123')).toBe('project_123');
      expect(ValidationUtils.sanitizeId('task-456')).toBe('task-456');
    });

    test('should handle null and undefined', () => {
      expect(ValidationUtils.sanitizeId(null)).toBe('');
      expect(ValidationUtils.sanitizeId(undefined)).toBe('');
    });

    test('should trim and normalize', () => {
      expect(ValidationUtils.sanitizeId('  id_123  ')).toBe('id_123');
    });
  });

  describe('isValidEmail', () => {
    test('should validate correct email formats', () => {
      expect(ValidationUtils.isValidEmail('test@example.com')).toBe(true);
      expect(ValidationUtils.isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(ValidationUtils.isValidEmail('user+tag@example.org')).toBe(true);
    });

    test('should reject invalid email formats', () => {
      expect(ValidationUtils.isValidEmail('invalid-email')).toBe(false);
      expect(ValidationUtils.isValidEmail('test@')).toBe(false);
      expect(ValidationUtils.isValidEmail('@domain.com')).toBe(false);
      expect(ValidationUtils.isValidEmail('test.domain.com')).toBe(false);
      expect(ValidationUtils.isValidEmail('')).toBe(false);
    });

    test('should handle null and undefined', () => {
      expect(ValidationUtils.isValidEmail(null as any)).toBe(false);
      expect(ValidationUtils.isValidEmail(undefined as any)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    test('should validate correct URL formats', () => {
      expect(ValidationUtils.isValidUrl('https://example.com')).toBe(true);
      expect(ValidationUtils.isValidUrl('http://localhost:3000')).toBe(true);
      expect(ValidationUtils.isValidUrl('https://sub.domain.com/path?param=value')).toBe(true);
    });

    test('should reject invalid URL formats', () => {
      expect(ValidationUtils.isValidUrl('not-a-url')).toBe(false);
      expect(ValidationUtils.isValidUrl('ftp://example.com')).toBe(false); // Only http/https allowed
      expect(ValidationUtils.isValidUrl('javascript:alert(1)')).toBe(false);
      expect(ValidationUtils.isValidUrl('')).toBe(false);
    });

    test('should handle null and undefined', () => {
      expect(ValidationUtils.isValidUrl(null as any)).toBe(false);
      expect(ValidationUtils.isValidUrl(undefined as any)).toBe(false);
    });
  });

  describe('isValidPriority', () => {
    test('should validate correct priorities', () => {
      expect(ValidationUtils.isValidPriority('critical')).toBe(true);
      expect(ValidationUtils.isValidPriority('high')).toBe(true);
      expect(ValidationUtils.isValidPriority('medium')).toBe(true);
      expect(ValidationUtils.isValidPriority('low')).toBe(true);
    });

    test('should reject invalid priorities', () => {
      expect(ValidationUtils.isValidPriority('urgent')).toBe(false);
      expect(ValidationUtils.isValidPriority('CRITICAL')).toBe(false);
      expect(ValidationUtils.isValidPriority('normal')).toBe(false);
      expect(ValidationUtils.isValidPriority('')).toBe(false);
    });

    test('should handle null and undefined', () => {
      expect(ValidationUtils.isValidPriority(null as any)).toBe(false);
      expect(ValidationUtils.isValidPriority(undefined as any)).toBe(false);
    });
  });

  describe('isValidStatus', () => {
    test('should validate correct statuses', () => {
      expect(ValidationUtils.isValidStatus('planning')).toBe(true);
      expect(ValidationUtils.isValidStatus('in_progress')).toBe(true);
      expect(ValidationUtils.isValidStatus('blocked')).toBe(true);
      expect(ValidationUtils.isValidStatus('completed')).toBe(true);
      expect(ValidationUtils.isValidStatus('archived')).toBe(true);
    });

    test('should reject invalid statuses', () => {
      expect(ValidationUtils.isValidStatus('active')).toBe(false);
      expect(ValidationUtils.isValidStatus('COMPLETED')).toBe(false);
      expect(ValidationUtils.isValidStatus('done')).toBe(false);
      expect(ValidationUtils.isValidStatus('')).toBe(false);
    });

    test('should handle null and undefined', () => {
      expect(ValidationUtils.isValidStatus(null as any)).toBe(false);
      expect(ValidationUtils.isValidStatus(undefined as any)).toBe(false);
    });
  });

  describe('isValidImportance', () => {
    test('should validate correct importance levels', () => {
      expect(ValidationUtils.isValidImportance('critical')).toBe(true);
      expect(ValidationUtils.isValidImportance('high')).toBe(true);
      expect(ValidationUtils.isValidImportance('medium')).toBe(true);
      expect(ValidationUtils.isValidImportance('low')).toBe(true);
    });

    test('should reject invalid importance levels', () => {
      expect(ValidationUtils.isValidImportance('urgent')).toBe(false);
      expect(ValidationUtils.isValidImportance('CRITICAL')).toBe(false);
      expect(ValidationUtils.isValidImportance('normal')).toBe(false);
      expect(ValidationUtils.isValidImportance('')).toBe(false);
    });

    test('should handle null and undefined', () => {
      expect(ValidationUtils.isValidImportance(null as any)).toBe(false);
      expect(ValidationUtils.isValidImportance(undefined as any)).toBe(false);
    });
  });

  describe('validateStringLength', () => {
    test('should validate strings within length limits', () => {
      expect(() => ValidationUtils.validateStringLength('test', 'field', 1, 10)).not.toThrow();
      expect(() => ValidationUtils.validateStringLength('exactly5', 'field', 5, 5)).not.toThrow();
    });

    test('should throw for strings too short', () => {
      expect(() => ValidationUtils.validateStringLength('', 'field', 1, 10))
        .toThrow("Field 'field' must be between 1 and 10 characters");
    });

    test('should throw for strings too long', () => {
      expect(() => ValidationUtils.validateStringLength('toolongstring', 'field', 1, 5))
        .toThrow("Field 'field' must be between 1 and 5 characters");
    });

    test('should handle null and undefined', () => {
      expect(() => ValidationUtils.validateStringLength(null as any, 'field', 1, 10))
        .toThrow("Field 'field' must be between 1 and 10 characters");
      expect(() => ValidationUtils.validateStringLength(undefined as any, 'field', 1, 10))
        .toThrow("Field 'field' must be between 1 and 10 characters");
    });
  });

  describe('validateProgress', () => {
    test('should validate valid progress values', () => {
      expect(() => ValidationUtils.validateProgress(0)).not.toThrow();
      expect(() => ValidationUtils.validateProgress(50)).not.toThrow();
      expect(() => ValidationUtils.validateProgress(100)).not.toThrow();
      expect(() => ValidationUtils.validateProgress(undefined)).not.toThrow();
      expect(() => ValidationUtils.validateProgress(null as any)).not.toThrow();
    });

    test('should throw for invalid progress values', () => {
      expect(() => ValidationUtils.validateProgress(-1))
        .toThrow('Progress must be between 0 and 100');
      expect(() => ValidationUtils.validateProgress(101))
        .toThrow('Progress must be between 0 and 100');
      expect(() => ValidationUtils.validateProgress(150))
        .toThrow('Progress must be between 0 and 100');
    });
  });

  describe('validateArray', () => {
    test('should validate valid arrays', () => {
      expect(() => ValidationUtils.validateArray(['item1', 'item2'], 'field', 1, 5)).not.toThrow();
      expect(() => ValidationUtils.validateArray([], 'field', 0, 5)).not.toThrow();
      expect(() => ValidationUtils.validateArray(['single'], 'field', 1, 1)).not.toThrow();
    });

    test('should throw for arrays too small', () => {
      expect(() => ValidationUtils.validateArray([], 'field', 1, 5))
        .toThrow("Field 'field' must have between 1 and 5 items");
    });

    test('should throw for arrays too large', () => {
      expect(() => ValidationUtils.validateArray([1, 2, 3, 4, 5, 6], 'field', 1, 5))
        .toThrow("Field 'field' must have between 1 and 5 items");
    });

    test('should handle null and undefined', () => {
      expect(() => ValidationUtils.validateArray(null as any, 'field', 1, 5))
        .toThrow("Field 'field' must be an array");
      expect(() => ValidationUtils.validateArray(undefined as any, 'field', 1, 5))
        .toThrow("Field 'field' must be an array");
    });

    test('should handle non-arrays', () => {
      expect(() => ValidationUtils.validateArray('not-array' as any, 'field', 1, 5))
        .toThrow("Field 'field' must be an array");
    });
  });

  describe('validateEnum', () => {
    test('should validate values in enum', () => {
      const validValues = ['option1', 'option2', 'option3'];
      expect(() => ValidationUtils.validateEnum('option1', 'field', validValues)).not.toThrow();
      expect(() => ValidationUtils.validateEnum('option2', 'field', validValues)).not.toThrow();
    });

    test('should throw for values not in enum', () => {
      const validValues = ['option1', 'option2', 'option3'];
      expect(() => ValidationUtils.validateEnum('invalid', 'field', validValues))
        .toThrow("Field 'field' must be one of: option1, option2, option3");
    });

    test('should handle null and undefined when required', () => {
      const validValues = ['option1', 'option2'];
      expect(() => ValidationUtils.validateEnum(null as any, 'field', validValues))
        .toThrow("Field 'field' must be one of: option1, option2");
      expect(() => ValidationUtils.validateEnum(undefined as any, 'field', validValues))
        .toThrow("Field 'field' must be one of: option1, option2");
    });
  });

  describe('validateOptionalEnum', () => {
    test('should validate values in enum or undefined', () => {
      const validValues = ['option1', 'option2', 'option3'];
      expect(() => ValidationUtils.validateOptionalEnum('option1', 'field', validValues)).not.toThrow();
      expect(() => ValidationUtils.validateOptionalEnum(undefined, 'field', validValues)).not.toThrow();
      expect(() => ValidationUtils.validateOptionalEnum(null as any, 'field', validValues)).not.toThrow();
    });

    test('should throw for invalid values', () => {
      const validValues = ['option1', 'option2', 'option3'];
      expect(() => ValidationUtils.validateOptionalEnum('invalid', 'field', validValues))
        .toThrow("Field 'field' must be one of: option1, option2, option3, or undefined");
    });
  });

  describe('Edge cases and error conditions', () => {
    test('should handle extreme string lengths', () => {
      const veryLongString = 'a'.repeat(10000);
      expect(() => ValidationUtils.validateStringLength(veryLongString, 'field', 1, 100))
        .toThrow();
    });

    test('should handle empty arrays in various validators', () => {
      expect(() => ValidationUtils.validateArray([], 'tags', 0, 10)).not.toThrow();
    });

    test('should handle special characters in validation', () => {
      expect(ValidationUtils.sanitizeString('test\n\r\tstring')).toBe('test\n\r\tstring');
      expect(ValidationUtils.sanitizeString('emoji😀test')).toBe('emoji😀test');
    });

    test('should handle boolean values in string sanitization', () => {
      expect(ValidationUtils.sanitizeString(true as any)).toBe('true');
      expect(ValidationUtils.sanitizeString(false as any)).toBe('false');
    });

    test('should handle object values in string sanitization', () => {
      expect(ValidationUtils.sanitizeString({ key: 'value' } as any)).toBe('[object Object]');
      expect(ValidationUtils.sanitizeString([1, 2, 3] as any)).toBe('1,2,3');
    });
  });
});