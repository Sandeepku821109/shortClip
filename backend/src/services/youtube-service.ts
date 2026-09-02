import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';
import { Logger } from '../utils/logger';

const logger = new Logger('YouTubeService');

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

export interface YouTubeDownloadResult {
  filePath: string;
  filename: string;
  bytes: number;
  info: YouTubeVideoInfo;
}

interface YtDlpJson {
  id?: string;
  title?: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  thumbnail?: string;
  description?: string;
  upload_date?: string;
  view_count?: number;
  channel_url?: string;
  channel_id?: string;
  webpage_url?: string;
  is_live?: boolean;
}

function youtubeUrlToEmbedId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

function normalizeInfo(data: YtDlpJson, originalUrl: string): YouTubeVideoInfo {
  const id = data.id || '';
  const duration = data.duration || 0;

  const mins = Math.floor(duration / 60);
  const secs = Math.floor(duration % 60);
  const durationLabel = `${mins}:${secs.toString().padStart(2, '0')}`;

  return {
    id,
    title: data.title || 'Untitled video',
    author: data.uploader || data.channel || 'Unknown',
    authorId: data.channel_id,
    durationSeconds: duration,
    durationLabel,
    thumbnailUrl: data.thumbnail || `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    description: data.description || '',
    channelUrl: data.channel_url,
    viewCount: data.view_count,
    uploadDate: data.upload_date,
    url: data.webpage_url || originalUrl,
    isLive: !!data.is_live,
  };
}

export class YouTubeService {
  private get ytDlp(): string {
    return config.ytDlpPath;
  }

  /**
   * Validate that a string is a YouTube URL and return the embeddable video ID,
   * or throw.
   */
  validateAndExtractId(url: string): string {
    const videoId = youtubeUrlToEmbedId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL. Please use a watch, share, shorts, or embed link.');
    }
    return videoId;
  }

  /**
   * Verify a YouTube URL by fetching metadata with yt-dlp (fast, no download).
   */
  async verifyVideo(url: string): Promise<YouTubeVideoInfo> {
    const videoId = this.validateAndExtractId(url);

    const args = [
      '--dump-single-json',
      '--no-download',
      '--skip-download',
      '--no-playlist',
      url,
    ];

    const result = await this.runYtDlp(args);

    if (!result.success) {
      logger.error('YouTube verification failed', { url, stderr: result.stderr });
      throw new Error(this.cleanError(result.stderr) || 'Could not verify the video. It may be private, removed, or region-restricted.');
    }

    let data: YtDlpJson;
    try {
      data = JSON.parse(result.stdout);
    } catch (e) {
      logger.error('Failed to parse yt-dlp output', { url, output: result.stdout });
      throw new Error('Could not parse video metadata.');
    }

    return {
      ...normalizeInfo(data, url),
      id: data.id || videoId,
    };
  }

  /**
   * Download a YouTube video as .mp4 into the given directory using yt-dlp.
   * Returns the absolute path to the downloaded file plus metadata.
   */
  async downloadVideo(
    url: string,
    outputDir: string,
    outputBaseName: string
  ): Promise<YouTubeDownloadResult> {
    const videoId = this.validateAndExtractId(url);
    await fs.mkdir(outputDir, { recursive: true });

    const outputTemplate = path.join(outputDir, `${outputBaseName}.%(ext)s`);

    // Prefer mp4; fall back to any format. -f bestvideo+bestaudio/best ensures
    // a good quality merge. Merge to mp4 via ffmpeg if needed.
    const args = [
      '--newline',
      '--no-playlist',
      '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '--output', outputTemplate,
      '--no-mtime',
      '--no-warnings',
      url,
    ];

    const result = await this.runYtDlp(args);

    if (!result.success) {
      logger.error('YouTube download failed', { url, stderr: result.stderr });
      throw new Error(this.cleanError(result.stderr) || 'Could not download the video.');
    }

    // Find the downloaded file
    const files = await fs.readdir(outputDir);
    const downloaded = files.find((name) => name.startsWith(outputBaseName));
    if (!downloaded) {
      throw new Error('Download completed but output file was not found.');
    }

    const filePath = path.join(outputDir, downloaded);
    const stat = await fs.stat(filePath);

    // Get metadata for return value
    const info = await this.verifyVideo(url).catch(() => ({
      id: videoId,
      title: outputBaseName,
      author: 'Unknown',
      durationSeconds: 0,
      durationLabel: '',
      thumbnailUrl: '',
      url,
    } as YouTubeVideoInfo));

    return {
      filePath,
      filename: downloaded,
      bytes: stat.size,
      info,
    };
  }

  private cleanError(stderr: string): string {
    if (!stderr) return '';
    // yt-dlp is quite verbose; pull out the useful last meaningful line
    const lines = stderr
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Look for a message containing ERROR
    const errorLine = lines.find((l) => /error/i.test(l));
    if (errorLine) {
      // Keep it reasonably short
      return errorLine.replace(/^ERROR:\s*/i, '').slice(0, 300);
    }
    return lines[lines.length - 1]?.slice(0, 300) || '';
  }

  private runYtDlp(args: string[]): Promise<{ success: boolean; stdout: string; stderr: string }> {
    logger.info('Running yt-dlp', { args });

    return new Promise((resolve) => {
      const child = spawn(this.ytDlp, args, {
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => {
        stdout += d.toString();
      });
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', (code) => {
        resolve({ success: code === 0, stdout, stderr });
      });

      child.on('error', (err) => {
        logger.error('Failed to spawn yt-dlp', err);
        resolve({ success: false, stdout, stderr: err.message });
      });
    });
  }
}

export const youtubeService = new YouTubeService();
