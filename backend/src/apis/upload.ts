import { Router, Request, Response } from 'express';
import multer from 'multer';
import { JobStore } from '../jobs/job-store';
import { StorageProvider } from '../storage/storage-provider';
import { JobRunner } from '../services/job-runner';
import { validateUpload } from '../middleware/validation';
import { uploadRateLimiter } from '../middleware/rate-limit';
import { generateJobId, generateSecureFilename } from '../utils/security';
import { Logger } from '../utils/logger';
import { config } from '../config';
import { Job, PLATFORM_PRESETS } from '../types';

const logger = new Logger('UploadAPI');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // No file size limit - storage is on-device local storage, not a database
    fileSize: Infinity,
    files: 1,
  },
});

export function createUploadRouter(
  jobStore: JobStore,
  storage: StorageProvider,
  jobRunner: JobRunner
): Router {
  const router = Router();

  // List available platforms
  router.get('/platforms', (_req: Request, res: Response) => {
    res.json({ platforms: PLATFORM_PRESETS });
  });

  router.post(
    '/',
    uploadRateLimiter,
    upload.single('video'),
    validateUpload,
    async (req: Request, res: Response) => {
      try {
        const file = req.file!;
        const platform = req.body.platform || '';
        const clipDuration = parseFloat(req.body.clipDuration) || 0;

        // Validate platform
        if (platform && !PLATFORM_PRESETS.find(p => p.id === platform)) {
          res.status(400).json({
            error: 'Invalid platform',
            validPlatforms: PLATFORM_PRESETS.map(p => p.id),
          });
          return;
        }

        // Validate clip duration (5-600 seconds)
        if (clipDuration > 0 && (clipDuration < 5 || clipDuration > 600)) {
          res.status(400).json({
            error: 'Invalid clip duration',
            hint: 'Clip duration must be between 5 and 600 seconds',
          });
          return;
        }

        const jobId = generateJobId();
        const secureFilename = generateSecureFilename(file.originalname);
        const sourceKey = `uploads/${jobId}/${secureFilename}`;

        logger.info('Upload received', {
          jobId,
          originalName: file.originalname,
          size: file.size,
          platform: platform || 'universal',
          clipDuration: clipDuration || 'auto',
        });

        // Save source video
        await storage.save(sourceKey, file.buffer);

        // Calculate expiration times
        const now = new Date();
        const sourceExpirationMs = config.sourceExpirationMinutes * 60 * 1000;
        const sourceExpiresAt = new Date(now.getTime() + sourceExpirationMs);

        // Create job
        const job: Job = {
          id: jobId,
          status: 'uploaded',
          progress: 0,
          message: 'Video uploaded',
          sourceFile: sourceKey,
          sourceCreatedAt: now.toISOString(),
          sourceExpiresAt: sourceExpiresAt.toISOString(),
          clips: [],
          error: null,
          platform: platform || '',
          clipDuration: clipDuration,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };

        await jobStore.createJob(job);

        // Start processing asynchronously
        jobRunner.startJob(jobId);

        res.json({
          jobId,
          status: job.status,
          platform: job.platform,
          clipDuration: job.clipDuration,
        });
      } catch (error) {
        logger.error('Upload error', error);
        res.status(500).json({ error: 'Upload failed' });
      }
    }
  );

  return router;
}