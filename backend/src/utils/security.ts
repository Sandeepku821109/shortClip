import path from 'path';
import { nanoid } from 'nanoid';

export function generateJobId(): string {
  return nanoid(16);
}

export function generateClipId(): string {
  return nanoid(12);
}

export function generateSecureFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const randomName = nanoid(20);
  return `${randomName}${ext}`;
}

export function sanitizeFilename(filename: string): string {
  // Remove any path traversal attempts
  const basename = path.basename(filename);
  // Remove any non-alphanumeric except dots and hyphens
  return basename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

export function isPathSafe(requestedPath: string, allowedBase: string): boolean {
  const resolved = path.resolve(requestedPath);
  const base = path.resolve(allowedBase);
  return resolved.startsWith(base);
}

export function validateJobId(jobId: string): boolean {
  // Alphanumeric, no path separators
  return /^[a-zA-Z0-9_-]{10,20}$/.test(jobId);
}

export function validateClipId(clipId: string): boolean {
  return /^[a-zA-Z0-9_-]{10,20}$/.test(clipId);
}