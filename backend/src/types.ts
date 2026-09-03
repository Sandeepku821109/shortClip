export interface Job {
  id: string;
  status: JobStatus;
  progress: number;
  message: string;
  sourceFile: string;
  sourceType?: JobSourceType;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceCreatedAt: string;
  sourceExpiresAt: string;
  clips: Clip[];
  error: string | null;
  errorCode?: string;
  platform: string;
  clipDuration: number;
  createdAt: string;
  updatedAt: string;
}

export type JobSourceType = 'upload';

export type JobStatus =
  | 'uploading'
  | 'uploaded'
  | 'queued'
  | 'analyzing'
  | 'processing'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'expired';

export interface Clip {
  id: string;
  start: number;
  end: number;
  duration: number;
  score: number;
  filePath: string;
  createdAt: string;
  expiresAt: string;
}

export interface ClipMetadata {
  id: string;
  start: number;
  end: number;
  duration: number;
  score: number;
}

export interface ProcessingResult {
  success: boolean;
  clips: Clip[];
  error?: string;
}

export interface PlatformPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  maxDuration: number;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  { id: 'youtube_shorts', name: 'YouTube Shorts', width: 1080, height: 1920, maxDuration: 60 },
  { id: 'tiktok', name: 'TikTok', width: 1080, height: 1920, maxDuration: 60 },
  { id: 'instagram_reels', name: 'Instagram Reels', width: 1080, height: 1920, maxDuration: 90 },
  { id: 'twitter', name: 'Twitter / X', width: 1080, height: 1920, maxDuration: 140 },
];