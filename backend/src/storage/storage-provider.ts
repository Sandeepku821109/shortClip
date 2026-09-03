export interface StorageProvider {
  /**
   * Save a file to storage
   */
  save(key: string, data: Buffer | NodeJS.ReadableStream, metadata?: Record<string, any>): Promise<void>;

  /**
   * Get a file from storage
   */
  get(key: string): Promise<Buffer>;

  /**
   * Get a readable stream for a file
   */
  getStream(key: string): Promise<NodeJS.ReadableStream>;

  /**
   * Delete a file from storage
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a file exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * List files in a directory/prefix
   */
  list(prefix: string): Promise<string[]>;

  /**
   * Get the absolute path for a key (local storage only)
   */
  getPath(key: string): string;
}