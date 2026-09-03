import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  
  // Upload config (no size limit - stored on device local storage, not a DB)
  maxVideoDurationSeconds: parseInt(process.env.MAX_VIDEO_DURATION_SECONDS || '1800', 10),
  maxClipsPerJob: parseInt(process.env.MAX_CLIPS_PER_JOB || '5', 10),
  
  // Expiration
  sourceExpirationMinutes: parseInt(process.env.SOURCE_EXPIRATION_MINUTES || '30', 10),
  clipExpirationMinutes: parseInt(process.env.CLIP_EXPIRATION_MINUTES || '30', 10),
  
  // Processing
  processingTimeoutSeconds: parseInt(process.env.PROCESSING_TIMEOUT_SECONDS || '1800', 10),
  
  // Paths
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
  // Prefer `py` launcher on Windows, fall back to `python3`/`python`
  pythonPath: process.env.PYTHON_PATH || (process.platform === 'win32' ? 'py' : 'python3'),
  storagePath: path.resolve(process.env.STORAGE_PATH || './storage'),
  
  // Cleanup
  cleanupIntervalSeconds: parseInt(process.env.CLEANUP_INTERVAL_SECONDS || '60', 10),
  
  // Transcription (optional)
  transcriptionProvider: process.env.TRANSCRIPTION_PROVIDER || '',
  transcriptionApiKey: process.env.TRANSCRIPTION_API_KEY || '',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
};

export const allowedMimeTypes = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/x-matroska',
];

export const allowedExtensions = [
  '.mp4',
  '.mov',
  '.webm',
  '.avi',
  '.mkv',
];