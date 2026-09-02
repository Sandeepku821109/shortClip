import React, { useState } from 'react';
import { verifyYouTube, createYoutubeJob } from '../api/client';
import { YouTubeVideoInfo } from '../types/job';

interface YouTubeInputProps {
  onYoutubeSubmit: (jobId: string, sourceTitle: string) => void;
  isProcessing: boolean;
}

const PLATFORMS = [
  { id: 'youtube_shorts', name: 'YouTube Shorts', icon: 'YT', color: 'bg-red-600' },
  { id: 'tiktok', name: 'TikTok', icon: 'TT', color: 'bg-black' },
  { id: 'instagram_reels', name: 'Instagram Reels', icon: 'IG', color: 'bg-gradient-to-br from-purple-600 to-pink-500' },
  { id: 'twitter', name: 'Twitter / X', icon: 'X', color: 'bg-gray-900' },
];

const CLIP_DURATIONS = [
  { value: 0, label: 'Auto', hint: 'Recommended' },
  { value: 20, label: '20 sec', hint: 'Short' },
  { value: 30, label: '30 sec', hint: 'Standard' },
  { value: 60, label: '60 sec', hint: 'Long' },
  { value: 90, label: '90 sec', hint: 'Reels' },
];

export function YouTubeInput({ onYoutubeSubmit, isProcessing }: YouTubeInputProps) {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(0);

  const handleVerify = async () => {
    setError(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please paste a YouTube URL.');
      return;
    }

    setIsVerifying(true);
    try {
      const info = await verifyYouTube(trimmed);
      setVideoInfo(info);
    } catch (err: any) {
      setVideoInfo(null);
      setError(err.message || 'Could not verify the video.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGenerate = async () => {
    setError(null);
    if (!videoInfo) return;

    setIsGenerating(true);
    try {
      const result = await createYoutubeJob(
        videoInfo.url,
        selectedPlatform || undefined,
        selectedDuration || undefined
      );
      onYoutubeSubmit(result.jobId, result.sourceTitle);
    } catch (err: any) {
      setError(err.message || 'Could not start processing.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setVideoInfo(null);
    setError(null);
    setSelectedPlatform('');
    setSelectedDuration(0);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* URL Input */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-300">Paste a YouTube URL</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={isVerifying || isGenerating || isProcessing}
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleVerify}
            disabled={isVerifying || isGenerating || isProcessing}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isVerifying ? 'Verifying...' : 'Verify'}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Paste a YouTube watch, shorts, share, or embed link. The backend downloads and processes it.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Preview */}
      {videoInfo && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
            <div className="aspect-video bg-black">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${videoInfo.id}`}
                title={videoInfo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="p-4 space-y-1">
              <h4 className="font-medium text-lg">{videoInfo.title}</h4>
              <p className="text-sm text-gray-400">{videoInfo.author} • {videoInfo.durationLabel}</p>
              {videoInfo.viewCount !== undefined && (
                <p className="text-xs text-gray-500">
                  {videoInfo.viewCount.toLocaleString()} views
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleReset}
            className="text-sm text-gray-400 hover:text-gray-200 underline"
          >
            Choose a different video
          </button>

          {/* Platform Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300">Target Platform (optional)</h3>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(selectedPlatform === platform.id ? '' : platform.id)}
                  disabled={isGenerating || isProcessing}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-all text-left
                    ${selectedPlatform === platform.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                    }
                    ${isGenerating || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold ${platform.color}`}>
                    {platform.icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{platform.name}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Output is 9:16 vertical with metadata stripped. Use the original creator's content only if you have permission.
            </p>
          </div>

          {/* Clip Length Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300">Clip Length</h3>
            <div className="grid grid-cols-5 gap-2">
              {CLIP_DURATIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedDuration(selectedDuration === option.value ? 0 : option.value)}
                  disabled={isGenerating || isProcessing}
                  className={`
                    p-3 rounded-lg border text-center transition-all
                    ${selectedDuration === option.value
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                    }
                    ${isGenerating || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{option.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Creating clips...' : 'Create Clips'}
          </button>
        </div>
      )}

      {/* Copyright reminder */}
      <div className="p-4 bg-amber-500/10 border border-amber-500 rounded-lg">
        <p className="text-amber-300 text-xs text-center">
          ⚠️ Only process videos you own or have permission to reuse. Stripping metadata does not
          grant copyright; always follow YouTube's copyright policy to avoid Content ID strikes.
        </p>
      </div>
    </div>
  );
}
