import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { StorageProvider } from './storage-provider';
import { Logger } from '../utils/logger';
import { isPathSafe } from '../utils/security';

const logger = new Logger('LocalStorage');

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    const dirs = ['uploads', 'clips', 'temp', 'metadata'];
    for (const dir of dirs) {
      const dirPath = path.join(this.basePath, dir);
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private resolveKey(key: string): string {
    const resolved = path.resolve(this.basePath, key);
    
    // Security: prevent path traversal
    if (!isPathSafe(resolved, this.basePath)) {
      throw new Error('Invalid path: path traversal detected');
    }
    
    return resolved;
  }

  async save(key: string, data: Buffer | NodeJS.ReadableStream, metadata?: Record<string, any>): Promise<void> {
    const filePath = this.resolveKey(key);
    const dir = path.dirname(filePath);
    
    await fs.mkdir(dir, { recursive: true });

    if (Buffer.isBuffer(data)) {
      await fs.writeFile(filePath, data);
    } else {
      // Stream
      const writeStream = fsSync.createWriteStream(filePath);
      await new Promise<void>((resolve, reject) => {
        data.pipe(writeStream);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });
    }

    logger.info('File saved', { key });
  }

  async get(key: string): Promise<Buffer> {
    const filePath = this.resolveKey(key);
    return await fs.readFile(filePath);
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream> {
    const filePath = this.resolveKey(key);
    return fsSync.createReadStream(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveKey(key);
    try {
      await fs.unlink(filePath);
      logger.info('File deleted', { key });
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File already deleted, ignore
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolveKey(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const dirPath = this.resolveKey(prefix);
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isFile())
        .map(entry => path.join(prefix, entry.name));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  getPath(key: string): string {
    return this.resolveKey(key);
  }
}