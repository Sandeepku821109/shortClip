import React, { useCallback, useState } from 'react';

interface UploadZoneProps {
  onUpload: (file: File, platform?: string, clipDuration?: number) => void;
  isUploading: boolean;
}

const MAX_SIZE_MB = 500;
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska'];
const CLIP_DURATIONS = [
  { value: 0, label: 'Auto', hint: 'Recommended' },
  { value: 20, label: '20 sec', hint: 'Short' },
  { value: 30, label: '30 sec', hint: 'Standard' },
  { value: 60, label: '60 sec', hint: 'Long' },
  { value: 90, label: '90 sec', hint: 'Reels' },
];
const PLATFORMS = [
  { id: 'youtube_shorts', name: 'YouTube Shorts', icon: 'YT', color: 'bg-red-600', maxDuration: '60s' },
  { id: 'tiktok', name: 'TikTok', icon: 'TT', color: 'bg-black', maxDuration: '60s' },
  { id: 'instagram_reels', name: 'Instagram Reels', icon: 'IG', color: 'bg-gradient-to-br from-purple-600 to-pink-500', maxDuration: '90s' },
  { id: 'twitter', name: 'Twitter / X', icon: 'X', color: 'bg-gray-900', maxDuration: '140s' },
];

export function UploadZone({ onUpload, isUploading }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(0);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload MP4, MOV, WEBM, AVI, or MKV';
    }

    return null;
  };

  const handleFile = (file: File) => {
    setError(null);
    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    onUpload(file, selectedPlatform || undefined, selectedDuration || undefined);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [selectedPlatform, selectedDuration]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const selectedPlatformName = PLATFORMS.find(p => p.id === selectedPlatform)?.name;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Platform Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-300">Target Platform (optional)</h3>
        <div className="grid grid-cols-2 gap-3">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatform(selectedPlatform === platform.id ? '' : platform.id)}
              disabled={isUploading}
              className={`
                flex items-center gap-3 p-3 rounded-lg border transition-all text-left
                ${selectedPlatform === platform.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                }
                ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className={`
                w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold
                ${platform.color}
              `}>
                {platform.icon}
              </span>
              <div>
                <p className="text-sm font-medium">{platform.name}</p>
                <p className="text-xs text-gray-500">Max {platform.maxDuration}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Clip Length Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-300">Clip Length</h3>
        <div className="grid grid-cols-5 gap-2">
          {CLIP_DURATIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedDuration(selectedDuration === option.value ? 0 : option.value)}
              disabled={isUploading}
              className={`
                p-3 rounded-lg border text-center transition-all
                ${selectedDuration === option.value
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                }
                ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <p className="text-sm font-semibold">{option.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{option.hint}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          id="file-input"
          className="hidden"
          accept="video/*"
          onChange={handleFileInput}
          disabled={isUploading}
        />

        <div className="space-y-4">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          <div>
            <label
              htmlFor="file-input"
              className="cursor-pointer text-blue-400 hover:text-blue-300 font-medium"
            >
              {isUploading ? 'Uploading...' : 'Select a video'}
            </label>
            <p className="text-gray-400 mt-1">or drag and drop</p>
          </div>

          <div className="text-sm text-gray-500 space-y-1">
            <p>Supported formats: MP4, MOV, WEBM, AVI, MKV</p>
            <p>Stored on device - no size limit</p>
            {selectedDuration > 0 && (
              <p className="text-purple-400">
                Clip length: {selectedDuration} seconds
              </p>
            )}
            {selectedPlatform && (
              <p className="text-blue-400">
                Output: {selectedPlatformName} (9:16 vertical, metadata stripped)
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
