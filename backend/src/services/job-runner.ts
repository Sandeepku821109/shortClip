import path from 'path';
import fs from 'fs/promises';
import { JobStore } from '../jobs/job-store';
import { StorageProvider } from '../storage/storage-provider';
import { PythonRunner } from './python-runner';
import { Logger } from '../utils/logger';
import { Job, Clip } from '../types';
import { config } from '../config';

const logger = new Logger('JobRunner');

export class JobRunner {
  private jobStore: JobStore;
  private storage: StorageProvider;
  private pythonRunner: PythonRunner;
  private processingJobs: Set<string> = new Set();

  constructor(jobStore: JobStore, storage: StorageProvider) {
    this.jobStore = jobStore;
    this.storage = storage;
    this.pythonRunner = new PythonRunner();
  }

  async processJob(jobId: string): Promise<void> {
    if (this.processingJobs.has(jobId)) {
      logger.warn('Job already processing', { jobId });
      return;
    }

    this.processingJobs.add(jobId);

    try {
      const job = await this.jobStore.getJob(jobId);
      if (!job) {
        logger.error('Job not found', { jobId });
        return;
      }

      await this.jobStore.updateJob(jobId, {
        status: 'queued',
        progress: 0,
        message: 'Processing queued',
      });

      // Check if source file still exists
      const sourceExists = await this.storage.exists(job.sourceFile);
      if (!sourceExists) {
        await this.jobStore.updateJob(jobId, {
          status: 'failed',
          error: 'Source file not found',
        });
        return;
      }

      const inputPath = this.storage.getPath(job.sourceFile);
      const outputDir = this.storage.getPath(`temp/${jobId}`);

      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      await this.jobStore.updateJob(jobId, {
        status: 'analyzing',
        progress: 10,
        message: 'Analyzing video',
      });

      // Run Python processor
      const result = await this.pythonRunner.runProcessor({
        jobId,
        inputPath,
        outputDir,
        maxClips: config.maxClipsPerJob,
        platform: job.platform || '',
        clipDuration: job.clipDuration || 0,
      });

      if (!result.success) {
        logger.error('Python processing failed', { jobId, stderr: result.stderr });
        await this.jobStore.updateJob(jobId, {
          status: 'failed',
          error: 'Video processing failed',
        });
        return;
      }

      // Read output metadata
      const metadataPath = path.join(outputDir, 'output.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      // Move clips to permanent storage and create clip records
      const clips: Clip[] = [];
      const now = new Date();
      const clipExpirationMs = config.clipExpirationMinutes * 60 * 1000;

      for (const clipMeta of metadata.clips) {
        const tempClipPath = path.join(outputDir, clipMeta.filename);
        const clipKey = `clips/${jobId}/${clipMeta.filename}`;
        
        // Move clip to storage
        const clipData = await fs.readFile(tempClipPath);
        await this.storage.save(clipKey, clipData);

        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + clipExpirationMs);

        clips.push({
          id: clipMeta.id,
          start: clipMeta.start,
          end: clipMeta.end,
          duration: clipMeta.duration,
          score: clipMeta.score,
          filePath: clipKey,
          createdAt: createdAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
        });
      }

      // Update job with clips
      await this.jobStore.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        message: 'Processing complete',
        clips,
      });

      // Clean up temp directory
      await fs.rm(outputDir, { recursive: true, force: true });

      logger.info('Job completed successfully', { jobId, clipCount: clips.length });
    } catch (error) {
      logger.error('Job processing error', error);
      await this.jobStore.updateJob(jobId, {
        status: 'failed',
        error: 'An unexpected error occurred during processing',
      });
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  async startJob(jobId: string): Promise<void> {
    // Start processing asynchronously
    this.processJob(jobId).catch((error) => {
      logger.error('Unhandled job processing error', error);
    });
  }
}