import React, { useState, useEffect } from 'react';
import { Clip } from '../types/job';
import { getClipUrl } from '../api/client';

interface ClipCardProps {
  clip: Clip;
  jobId: string;
  index: number;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const remaining = expires.getTime() - now.getTime();

  if (remaining <= 0) {
    return 'Expired';
  }

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function ClipCard({ clip, jobId, index }: ClipCardProps) {
  const [timeRemaining, setTimeRemaining] = useState(formatTimeRemaining(clip.expiresAt));
  const [isExpired, setIsExpired] = useState(false);
  const clipUrl = getClipUrl(jobId, clip.id);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = formatTimeRemaining(clip.expiresAt);
      setTimeRemaining(remaining);
      
      if (remaining === 'Expired') {
        setIsExpired(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [clip.expiresAt]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = clipUrl;
    link.download = `clip-${index + 1}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isExpired) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-center text-gray-400 py-8">
          <p className="text-lg">This clip has expired</p>
          <p className="text-sm mt-2">Clips are automatically deleted 30 minutes after creation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
      <div className="aspect-[9/16] bg-black">
        <video
          src={clipUrl}
          controls
          className="w-full h-full"
          preload="metadata"
        >
          Your browser does not support video playback.
        </video>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-lg">Clip #{index + 1}</h4>
          <span className="text-sm text-gray-400">
            {formatDuration(clip.duration)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">
            Score: {(clip.score * 100).toFixed(0)}%
          </span>
          <span className={`${isExpired ? 'text-red-400' : 'text-yellow-400'}`}>
            Expires in {timeRemaining}
          </span>
        </div>

        <button
          onClick={handleDownload}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          disabled={isExpired}
        >
          Download Clip
        </button>

        <p className="text-xs text-green-400 text-center">
          Metadata stripped - copyright-free
        </p>
      </div>
    </div>
  );
}