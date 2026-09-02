import {
  validateJobId,
  validateClipId,
  sanitizeFilename,
  isPathSafe,
} from '../../backend/src/utils/security';
import path from 'path';

describe('Security Utils', () => {
  describe('validateJobId', () => {
    it('should accept valid job IDs', () => {
      expect(validateJobId('abc123XYZ_-')).toBe(true);
      expect(validateJobId('1234567890abcdef')).toBe(true);
    });

    it('should reject invalid job IDs', () => {
      expect(validateJobId('../etc/passwd')).toBe(false);
      expect(validateJobId('../../secret')).toBe(false);
      expect(validateJobId('id with spaces')).toBe(false);
      expect(validateJobId('id/with/slashes')).toBe(false);
      expect(validateJobId('')).toBe(false);
      expect(validateJobId('x'.repeat(100))).toBe(false);
    });
  });

  describe('validateClipId', () => {
    it('should accept valid clip IDs', () => {
      expect(validateClipId('clip123ABC')).toBe(true);
    });

    it('should reject invalid clip IDs', () => {
      expect(validateClipId('../file')).toBe(false);
      expect(validateClipId('clip/123')).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path traversal attempts', () => {
      expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
      expect(sanitizeFilename('../secret.txt')).toBe('secret.txt');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeFilename('file<>:|?.txt')).toBe('file_______.txt');
    });

    it('should preserve safe filenames', () => {
      expect(sanitizeFilename('video-clip_01.mp4')).toBe('video-clip_01.mp4');
    });
  });

  describe('isPathSafe', () => {
    it('should accept paths within allowed base', () => {
      const base = '/var/storage';
      expect(isPathSafe('/var/storage/uploads/file.mp4', base)).toBe(true);
      expect(isPathSafe('/var/storage/clips/clip1.mp4', base)).toBe(true);
    });

    it('should reject paths outside allowed base', () => {
      const base = '/var/storage';
      expect(isPathSafe('/etc/passwd', base)).toBe(false);
      expect(isPathSafe('/var/other/file.mp4', base)).toBe(false);
    });

    it('should reject path traversal attempts', () => {
      const base = '/var/storage';
      expect(isPathSafe('/var/storage/../../../etc/passwd', base)).toBe(false);
    });
  });
});