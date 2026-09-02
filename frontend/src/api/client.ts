import { Job } from '../types/job';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function uploadVideo(file: File, platform?: string, clipDuration?: number): Promise<{ jobId: string; status: string; platform: string; clipDuration: number }> {
  const formData = new FormData();
  formData.append('video', file);
  if (platform) {
    formData.append('platform', platform);
  }
  if (clipDuration && clipDuration > 0) {
    formData.append('clipDuration', clipDuration.toString());
  }

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
}

export async function getJob(jobId: string): Promise<Job> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch job');
  }

  return response.json();
}

export function getClipUrl(jobId: string, clipId: string): string {
  return `${API_BASE}/clips/${jobId}/${clipId}`;
}

export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}

export interface PlatformPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  maxDuration: number;
}

export async function getPlatforms(): Promise<PlatformPreset[]> {
  const response = await fetch(`${API_BASE}/upload/platforms`);
  if (!response.ok) {
    return [
      { id: 'youtube_shorts', name: 'YouTube Shorts', width: 1080, height: 1920, maxDuration: 60 },
      { id: 'tiktok', name: 'TikTok', width: 1080, height: 1920, maxDuration: 60 },
      { id: 'instagram_reels', name: 'Instagram Reels', width: 1080, height: 1920, maxDuration: 90 },
      { id: 'twitter', name: 'Twitter / X', width: 1080, height: 1920, maxDuration: 140 },
    ];
  }
  const data = await response.json();
  return data.platforms;
}