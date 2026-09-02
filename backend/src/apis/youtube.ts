import { Router, Request, Response } from 'express';
import { JobStore } from '../jobs/job-store';
import { StorageProvider } from '../storage/storage-provider';
import { JobRunner } from '../services/job-runner';
import { youtubeService } from '../services/youtube-service';
import { YouTubeUploadService } from '../services/youtube-upload-service';
import { generateJobId } from '../utils/security';
import { Logger } from '../utils/logger';
import { config } from '../config';
import { Job, PLATFORM_PRESETS } from '../types';

const logger = new Logger('YouTubeAPI');

export function createYouTubeRouter(
  jobStore: JobStore,
  storage: StorageProvider,
  jobRunner: JobRunner
): Router {
  const router = Router();
  const uploadService = new YouTubeUploadService(storage);

  // Verify a YouTube URL and return video metadata (for preview)
  router.post('/verify', async (req: Request, res: Response) => {
    try {
      const { url } = req.body || {};
      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'YouTube URL is required' });
        return;
      }

      const info = await youtubeService.verifyVideo(url);
      res.json(info);
    } catch (error: any) {
      logger.error('YouTube verify error', error);
      res.status(400).json({ error: error.message || 'Could not verify the video.' });
    }
  });

  // Create a clip-processing job from a YouTube URL.
  // The backend downloads the video, runs the processor, and generates clips.
  router.post('/create-job', async (req: Request, res: Response) => {
    try {
      const { url, platform = '', clipDuration = 0 } = req.body || {};
      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'YouTube URL is required' });
        return;
      }

      // Validate the URL early
      youtubeService.validateAndExtractId(url);

      if (platform && !PLATFORM_PRESETS.find(p => p.id === platform)) {
        res.status(400).json({ error: 'Invalid platform' });
        return;
      }

      if (clipDuration > 0 && (clipDuration < 5 || clipDuration > 600)) {
        res.status(400).json({ error: 'Invalid clip duration' });
        return;
      }

      // Verify the video to get a title for the job
      const info = await youtubeService.verifyVideo(url);

      const jobId = generateJobId();
      const now = new Date();
      const sourceExpirationMs = config.sourceExpirationMinutes * 60 * 1000;
      const sourceExpiresAt = new Date(now.getTime() + sourceExpirationMs);

      // For YouTube jobs the sourceFile is not used for upload; it stores the
      // temp source. We set a placeholder path and rely on sourceType='youtube'.
      const job: Job = {
        id: jobId,
        status: 'uploaded',
        progress: 0,
        message: 'Video queued from YouTube',
        sourceFile: `youtube/${jobId}/source.mp4`,
        sourceType: 'youtube',
        sourceUrl: url,
        sourceTitle: info.title,
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
      jobRunner.startJob(jobId);

      res.json({
        jobId,
        status: job.status,
        platform: job.platform,
        clipDuration: job.clipDuration,
        sourceUrl: url,
        sourceTitle: info.title,
      });
    } catch (error: any) {
      logger.error('YouTube create-job error', error);
      res.status(400).json({ error: error.message || 'Failed to start processing.' });
    }
  });

  // Upload a generated clip to YouTube.
  // Requires OAuth credentials. Body: { source: storageKey of clip, title, description, privacyStatus, accessToken?, refreshToken? }
  router.post('/upload', async (req: Request, res: Response) => {
    try {
      const {
        source,
        title,
        description = '',
        tags = [],
        privacyStatus = 'private',
        accessToken,
        refreshToken,
      } = req.body || {};

      if (!source || typeof source !== 'string') {
        res.status(400).json({ error: 'Clip source key is required' });
        return;
      }

      if (!title || typeof title !== 'string' || !title.trim()) {
        res.status(400).json({ error: 'Title is required' });
        return;
      }

      const result = await uploadService.uploadFile(
        source,
        {
          title: title.trim(),
          description,
          tags: Array.isArray(tags) ? tags : [],
          privacyStatus,
        },
        accessToken,
        refreshToken
      );

      res.json(result);
    } catch (error: any) {
      logger.error('YouTube upload error', error);
      res.status(500).json({ error: error.message || 'YouTube upload failed.' });
    }
  });

  return router;
}
