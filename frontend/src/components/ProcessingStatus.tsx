import React from 'react';
import { Job } from '../types/job';

interface ProcessingStatusProps {
  job: Job;
}

const statusMessages: Record<string, string> = {
  uploading: 'Uploading video...',
  uploaded: 'Video uploaded',
  queued: 'Processing queued',
  analyzing: 'Analyzing video...',
  processing: 'Processing video...',
  generating: 'Generating clips...',
  completed: 'Processing complete',
  failed: 'Processing failed',
  expired: 'Job expired',
};

const platformNames: Record<string, string> = {
  youtube_shorts: 'YouTube Shorts',
  tiktok: 'TikTok',
  instagram_reels: 'Instagram Reels',
  twitter: 'Twitter / X',
};

export function ProcessingStatus({ job }: ProcessingStatusProps) {
  const isProcessing = ['uploading', 'uploaded', 'queued', 'analyzing', 'processing', 'generating'].includes(job.status);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            {statusMessages[job.status] || job.message}
          </h3>
          {isProcessing && (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
          )}
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-400">{job.progress}%</p>
          </div>
        )}

        {job.error && (
          <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
            <p className="text-red-400 text-sm">{job.error}</p>
          </div>
        )}

        <div className="text-sm text-gray-400 space-y-1">
          <p>Job ID: {job.id}</p>
          {job.sourceTitle && (
            <p className="text-red-400 truncate">
              Source: {job.sourceTitle}
            </p>
          )}
          {job.platform && (
            <p className="text-blue-400">
              Target: {platformNames[job.platform] || job.platform}
            </p>
          )}
          {job.clipDuration && job.clipDuration > 0 && (
            <p className="text-purple-400">
              Clip length: {job.clipDuration} seconds
            </p>
          )}
          <p className="text-green-400 text-xs">
            Copyright-free output: metadata stripped, no watermarks
          </p>
          {job.status === 'completed' && (
            <p className="text-green-400">✓ {job.clips.length} clips generated</p>
          )}
        </div>
      </div>
    </div>
  );
}
