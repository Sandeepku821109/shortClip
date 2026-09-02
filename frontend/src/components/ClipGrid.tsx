import React from 'react';
import { Job } from '../types/job';
import { ClipCard } from './ClipCard';

interface ClipGridProps {
  job: Job;
}

export function ClipGrid({ job }: ClipGridProps) {
  if (job.clips.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Your Clips</h2>
        <p className="text-gray-400">
          {job.clips.length} clip{job.clips.length !== 1 ? 's' : ''} generated
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {job.clips.map((clip, index) => (
          <ClipCard
            key={clip.id}
            clip={clip}
            jobId={job.id}
            index={index}
          />
        ))}
      </div>

      <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg">
        <p className="text-yellow-400 text-sm">
          ⚠️ All clips will be automatically deleted 30 minutes after creation for your privacy.
        </p>
      </div>
    </div>
  );
}