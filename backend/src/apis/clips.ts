import { Router, Request, Response } from 'express';
import { JobStore } from '../jobs/job-store';
import { StorageProvider } from '../storage/storage-provider';
import { validateJobId, validateClipId } from '../utils/security';
import { Logger } from '../utils/logger';

const logger = new Logger('ClipsAPI');

export function createClipsRouter(
  jobStore: JobStore,
  storage: StorageProvider
): Router {
  const router = Router();

  router.get('/:jobId/:clipId', async (req: Request, res: Response) => {
    try {
      const { jobId, clipId } = req.params;

      if (!validateJobId(jobId)) {
        res.status(400).json({ error: 'Invalid job ID' });
        return;
      }

      if (!validateClipId(clipId)) {
        res.status(400).json({ error: 'Invalid clip ID' });
        return;
      }

      const job = await jobStore.getJob(jobId);

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      const clip = job.clips.find((c) => c.id === clipId);

      if (!clip) {
        res.status(404).json({ error: 'Clip not found' });
        return;
      }

      // Check if clip has expired
      const now = new Date();
      const expiresAt = new Date(clip.expiresAt);

      if (now >= expiresAt) {
        res.status(404).json({ error: 'CLIP_EXPIRED' });
        return;
      }

      // Check if file exists
      const exists = await storage.exists(clip.filePath);
      if (!exists) {
        res.status(404).json({ error: 'Clip file not found' });
        return;
      }

      // Stream the video file
      const stream = await storage.getStream(clip.filePath);

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="clip-${clipId}.mp4"`
      );

      stream.pipe(res);
    } catch (error) {
      logger.error('Get clip error', error);
      res.status(500).json({ error: 'Failed to fetch clip' });
    }
  });

  return router;
}