import { JobStore } from '../jobs/job-store';
import { StorageProvider } from '../storage/storage-provider';
import { Logger } from '../utils/logger';
import { config } from '../config';

const logger = new Logger('CleanupWorker');

export class CleanupWorker {
  private jobStore: JobStore;
  private storage: StorageProvider;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(jobStore: JobStore, storage: StorageProvider) {
    this.jobStore = jobStore;
    this.storage = storage;
  }

  start(): void {
    if (this.intervalId) {
      logger.warn('Cleanup worker already running');
      return;
    }

    logger.info('Starting cleanup worker', {
      intervalSeconds: config.cleanupIntervalSeconds,
    });

    // Run immediately on start
    this.runCleanup().catch((error) => {
      logger.error('Initial cleanup error', error);
    });

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.runCleanup().catch((error) => {
        logger.error('Cleanup error', error);
      });
    }, config.cleanupIntervalSeconds * 1000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Cleanup worker stopped');
    }
  }

  private async runCleanup(): Promise<void> {
    logger.debug('Running cleanup');

    const now = new Date();
    let deletedSources = 0;
    let deletedClips = 0;
    let deletedJobs = 0;

    try {
      const jobs = await this.jobStore.listJobs();

      for (const job of jobs) {
        let shouldDeleteJob = false;

        // Check source expiration
        const sourceExpiresAt = new Date(job.sourceExpiresAt);
        if (now >= sourceExpiresAt) {
          // Delete source file
          try {
            const sourceExists = await this.storage.exists(job.sourceFile);
            if (sourceExists) {
              await this.storage.delete(job.sourceFile);
              deletedSources++;
              logger.info('Deleted expired source', {
                jobId: job.id,
                file: job.sourceFile,
              });
            }
          } catch (error) {
            logger.error('Failed to delete expired source', error);
          }
        }

        // Check clip expiration
        const remainingClips = [];
        for (const clip of job.clips) {
          const clipExpiresAt = new Date(clip.expiresAt);
          if (now >= clipExpiresAt) {
            // Delete clip
            try {
              const clipExists = await this.storage.exists(clip.filePath);
              if (clipExists) {
                await this.storage.delete(clip.filePath);
                deletedClips++;
                logger.info('Deleted expired clip', {
                  jobId: job.id,
                  clipId: clip.id,
                  file: clip.filePath,
                });
              }
            } catch (error) {
              logger.error('Failed to delete expired clip', error);
            }
          } else {
            remainingClips.push(clip);
          }
        }

        // Update job if clips were deleted
        if (remainingClips.length !== job.clips.length) {
          await this.jobStore.updateJob(job.id, {
            clips: remainingClips,
          });
        }

        // Delete job if source expired and no clips remain
        if (now >= sourceExpiresAt && remainingClips.length === 0) {
          shouldDeleteJob = true;
        }

        // Delete old failed/expired jobs
        if (job.status === 'failed' || job.status === 'expired') {
          const jobAge = now.getTime() - new Date(job.createdAt).getTime();
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          if (jobAge > maxAge) {
            shouldDeleteJob = true;
          }
        }

        if (shouldDeleteJob) {
          await this.jobStore.deleteJob(job.id);
          deletedJobs++;
          logger.info('Deleted expired job', { jobId: job.id });
        }
      }

      // Clean up orphaned temp files
      await this.cleanupTempFiles();

      if (deletedSources > 0 || deletedClips > 0 || deletedJobs > 0) {
        logger.info('Cleanup complete', {
          deletedSources,
          deletedClips,
          deletedJobs,
        });
      }
    } catch (error) {
      logger.error('Cleanup error', error);
    }
  }

  private async cleanupTempFiles(): Promise<void> {
    try {
      const tempFiles = await this.storage.list('temp');
      const now = Date.now();
      const maxAge = 2 * 60 * 60 * 1000; // 2 hours

      for (const file of tempFiles) {
        try {
          const filePath = this.storage.getPath(file);
          const stat = await import('fs/promises').then(fs => fs.stat(filePath));
          const age = now - stat.mtimeMs;

          if (age > maxAge) {
            await this.storage.delete(file);
            logger.info('Deleted orphaned temp file', { file });
          }
        } catch (error) {
          // File might already be deleted
        }
      }
    } catch (error) {
      logger.error('Temp cleanup error', error);
    }
  }
}