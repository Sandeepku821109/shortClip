import { Router, Request, Response } from 'express';
import { JobStore } from '../jobs/job-store';
import { validateJobId } from '../utils/security';
import { Logger } from '../utils/logger';

const logger = new Logger('JobsAPI');

export function createJobsRouter(jobStore: JobStore): Router {
  const router = Router();

  router.get('/:jobId', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      if (!validateJobId(jobId)) {
        res.status(400).json({ error: 'Invalid job ID' });
        return;
      }

      const job = await jobStore.getJob(jobId);

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      // Check if job has expired
      const now = new Date();
      const sourceExpiresAt = new Date(job.sourceExpiresAt);
      if (now >= sourceExpiresAt && job.status !== 'completed' && job.status !== 'failed') {
        await jobStore.updateJob(jobId, { status: 'expired' });
        res.status(404).json({ error: 'Job expired' });
        return;
      }

      res.json({
        id: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        error: job.error,
        createdAt: job.createdAt,
        sourceExpiresAt: job.sourceExpiresAt,
        platform: job.platform || '',
        clipDuration: job.clipDuration || 0,
        clips: job.clips.map((clip) => ({
          id: clip.id,
          start: clip.start,
          end: clip.end,
          duration: clip.duration,
          score: clip.score,
          createdAt: clip.createdAt,
          expiresAt: clip.expiresAt,
        })),
      });
    } catch (error) {
      logger.error('Get job error', error);
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  });

  return router;
}
