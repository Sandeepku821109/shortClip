import React, { useState, useEffect, useCallback } from 'react';
import { UploadZone } from './components/UploadZone';
import { YouTubeInput } from './components/YouTubeInput';
import { ProcessingStatus } from './components/ProcessingStatus';
import { ClipGrid } from './components/ClipGrid';
import { uploadVideo, getJob } from './api/client';
import { Job } from './types/job';

type SourceTab = 'upload' | 'youtube';

function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceTab, setSourceTab] = useState<SourceTab>('upload');

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const job = await getJob(jobId);
      setCurrentJob(job);

      // Continue polling if still processing
      if (['uploading', 'uploaded', 'queued', 'analyzing', 'processing', 'generating'].includes(job.status)) {
        setTimeout(() => pollJob(jobId), 2000);
      }
    } catch (err) {
      console.error('Failed to poll job:', err);
      setError('Failed to fetch job status');
    }
  }, []);

  const handleUpload = async (file: File, platform?: string, clipDuration?: number) => {
    setError(null);
    setIsUploading(true);

    try {
      const result = await uploadVideo(file, platform, clipDuration);
      setIsUploading(false);
      
      // Start polling
      pollJob(result.jobId);
    } catch (err: any) {
      setIsUploading(false);
      setError(err.message || 'Upload failed');
    }
  };

  const handleYoutubeSubmit = useCallback((jobId: string, _sourceTitle: string) => {
    setError(null);
    pollJob(jobId);
  }, [pollJob]);

  const handleReset = () => {
    setCurrentJob(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            ShortClip
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Turn long videos into engaging short clips
          </p>
          <p className="text-sm text-gray-500">
            Privacy-focused • Temporary processing • No account needed
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="max-w-2xl mx-auto mb-8 p-4 bg-blue-500/10 border border-blue-500 rounded-lg">
          <p className="text-blue-300 text-sm text-center">
            🔒 Your videos are temporary. Uploaded videos are automatically deleted after 30 minutes,
            and generated clips are automatically deleted 30 minutes after creation.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-8">
          {!currentJob ? (
            <>
              {/* Source selector */}
              <div className="flex justify-center gap-2 max-w-md mx-auto">
                <button
                  onClick={() => setSourceTab('upload')}
                  className={`
                    flex-1 py-3 rounded-lg font-medium transition-colors
                    ${sourceTab === 'upload'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}
                  `}
                >
                  Upload File
                </button>
                <button
                  onClick={() => setSourceTab('youtube')}
                  className={`
                    flex-1 py-3 rounded-lg font-medium transition-colors
                    ${sourceTab === 'youtube'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}
                  `}
                >
                  YouTube URL
                </button>
              </div>

              {sourceTab === 'upload' ? (
                <UploadZone onUpload={handleUpload} isUploading={isUploading} />
              ) : (
                <YouTubeInput onYoutubeSubmit={handleYoutubeSubmit} isProcessing={isUploading} />
              )}
            </>
          ) : (
            <>
              <ProcessingStatus job={currentJob} />
              
              {currentJob.status === 'completed' && (
                <>
                  <ClipGrid job={currentJob} />
                  
                  <div className="text-center mt-8">
                    <button
                      onClick={handleReset}
                      className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                    >
                      Process Another Video
                    </button>
                  </div>
                </>
              )}

              {currentJob.status === 'failed' && (
                <div className="text-center mt-8">
                  <button
                    onClick={handleReset}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Features */}
        {!currentJob && (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl mb-2">🎬</div>
              <h3 className="font-medium mb-2">Smart Detection</h3>
              <p className="text-sm text-gray-400">
                Automatically finds the best moments in your video
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl mb-2">📱</div>
              <h3 className="font-medium mb-2">Vertical Format</h3>
              <p className="text-sm text-gray-400">
                Optimized for TikTok, Instagram Reels, and YouTube Shorts
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl mb-2">🔒</div>
              <h3 className="font-medium mb-2">Privacy First</h3>
              <p className="text-sm text-gray-400">
                No accounts, no permanent storage, auto-delete after 30 minutes
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>Anonymous video processing • No data retention • Open source</p>
        </footer>
      </div>
    </div>
  );
}

export default App;