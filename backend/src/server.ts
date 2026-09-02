import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { Logger } from './utils/logger';
import { LocalStorageProvider } from './storage/local-storage';
import { FilesystemJobStore } from './jobs/filesystem-job-store';
import { JobRunner } from './services/job-runner';
import { CleanupWorker } from './services/cleanup-worker';
import { createUploadRouter } from './apis/upload';
import { createJobsRouter } from './apis/jobs';
import { createClipsRouter } from './apis/clips';
import { createYouTubeRouter } from './apis/youtube';
import { errorHandler } from './middleware/error-handler';

const logger = new Logger('Server');

async function main() {
  const app = express();

  // Middleware
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));
  app.use(express.json());

  // Initialize storage and job store
  const storage = new LocalStorageProvider(config.storagePath);
  const jobStore = new FilesystemJobStore(config.storagePath);

  // Initialize job runner
  const jobRunner = new JobRunner(jobStore, storage);

  // Initialize cleanup worker
  const cleanupWorker = new CleanupWorker(jobStore, storage);
  cleanupWorker.start();

  // API routes
  app.use('/api/upload', createUploadRouter(jobStore, storage, jobRunner));
  app.use('/api/jobs', createJobsRouter(jobStore));
  app.use('/api/clips', createClipsRouter(jobStore, storage));
  app.use('/api/youtube', createYouTubeRouter(jobStore, storage, jobRunner));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Error handler
  app.use(errorHandler);

  // Start server
  app.listen(config.port, () => {
    logger.info('Server started', {
      port: config.port,
      storagePath: config.storagePath,
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    cleanupWorker.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    cleanupWorker.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error('Server startup error', error);
  process.exit(1);
});