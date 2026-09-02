import { spawn } from 'child_process';
import path from 'path';
import { config } from '../config';
import { Logger } from '../utils/logger';

const logger = new Logger('PythonRunner');

export interface PythonProcessOptions {
  jobId: string;
  inputPath: string;
  outputDir: string;
  maxClips?: number;
  platform?: string;
  clipDuration?: number;
  transcriptionProvider?: string;
  transcriptionApiKey?: string;
}

export interface PythonProcessResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export class PythonRunner {
  private processorPath: string;

  constructor() {
    this.processorPath = path.resolve(__dirname, '../../processor');
  }

  async runProcessor(options: PythonProcessOptions): Promise<PythonProcessResult> {
    const {
      jobId,
      inputPath,
      outputDir,
      maxClips = config.maxClipsPerJob,
      platform = '',
      clipDuration = 0,
      transcriptionProvider = config.transcriptionProvider,
      transcriptionApiKey = config.transcriptionApiKey,
    } = options;

    const args = [
      path.join(this.processorPath, 'main.py'),
      '--job-id', jobId,
      '--input', inputPath,
      '--output', outputDir,
      '--max-clips', maxClips.toString(),
      '--ffmpeg-path', config.ffmpegPath,
      '--ffprobe-path', config.ffprobePath,
    ];

    if (platform) {
      args.push('--platform', platform);
    }

    if (clipDuration && clipDuration > 0) {
      args.push('--clip-duration', clipDuration.toString());
    }

    if (transcriptionProvider) {
      args.push('--transcription-provider', transcriptionProvider);
    }

    if (transcriptionApiKey) {
      args.push('--transcription-api-key', transcriptionApiKey);
    }

    logger.info('Starting Python processor', { jobId, inputPath });

    return new Promise((resolve) => {
      const child = spawn(config.pythonPath, args, {
        cwd: this.processorPath,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        logger.debug('Python stdout', { jobId, text });
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        logger.debug('Python stderr', { jobId, text });
      });

      // Timeout
      const timeout = setTimeout(() => {
        logger.error('Python process timeout', { jobId });
        child.kill('SIGTERM');
      }, config.processingTimeoutSeconds * 1000);

      child.on('close', (exitCode) => {
        clearTimeout(timeout);
        
        const success = exitCode === 0;
        logger.info('Python process finished', { jobId, exitCode, success });

        resolve({
          success,
          stdout,
          stderr,
          exitCode,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        logger.error('Python process error', error);

        resolve({
          success: false,
          stdout,
          stderr: stderr + '\n' + error.message,
          exitCode: null,
        });
      });
    });
  }
}