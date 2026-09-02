import path from 'path';
import fs from 'fs/promises';
import { JobStore } from '../jobs/job-store';
import { StorageProvider } from '../storage/storage-provider';
import { PythonRunner } from './python-runner';
import { youtubeService } from './youtube-service';
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

      await this.jobStore.updateJob(jobId, {
        status: 'analyzing',
        progress: 10,
        message: job.sourceType === 'youtube' ? 'Downloading video from YouTube' : 'Analyzing video',
      });

      const outputDir = this.storage.getPath(`temp/${jobId}`);

      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      let inputPath = '';

      if (job.sourceType === 'youtube' && job.sourceUrl) {
        // Download the YouTube video into the temp directory
        const download = await youtubeService.downloadVideo(
          job.sourceUrl,
          outputDir,
          'source'
        );
        inputPath = download.filePath;

        await this.jobStore.updateJob(jobId, {
          status: 'analyzing',
          progress: 35,
          message: 'Downloaded video, analyzing',
          sourceTitle: download.info.title,
        });
      } else {
        // Uploaded file path from storage
        const sourceExists = await this.storage.exists(job.sourceFile);
        if (!sourceExists) {
          await this.jobStore.updateJob(jobId, {
            status: 'failed',
            error: 'Source file not found',
          });
          return;
        }
        inputPath = this.storage.getPath(job.sourceFile);
      }

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

      const job = await this.jobStore.getJob(jobId);
      const errMsg = error instanceof Error ? error.message : '';
      const friendly = errMsg.includes('Invalid YouTube URL')
        ? errMsg
        : 'An unexpected error occurred during processing';

      await this.jobStore.updateJob(jobId, {
        status: 'failed',
        error: friendly,
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