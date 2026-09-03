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
  errorCode?: string;
  createdAt: string;
  sourceExpiresAt: string;
  clips: Clip[];
  platform?: string;
  clipDuration?: number;
  sourceType?: 'upload';
  sourceUrl?: string;
  sourceTitle?: string;
}