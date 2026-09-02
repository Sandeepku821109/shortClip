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
  createdAt: string;
  expiresAt: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  progress: number;
  message: string;
  error: string | null;
  createdAt: string;
  sourceExpiresAt: string;
  clips: Clip[];
  platform?: string;
  clipDuration?: number;
  sourceType?: 'upload' | 'youtube';
  sourceUrl?: string;
  sourceTitle?: string;
}

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  durationSeconds: number;
  durationLabel: string;
  thumbnailUrl: string;
  description?: string;
  channelUrl?: string;
  viewCount?: number;
  uploadDate?: string;
  url: string;
  isLive?: boolean;
}