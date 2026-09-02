#!/usr/bin/env python3

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Any

from ffmpeg_wrapper import FFmpegWrapper
from clip_detector import ClipDetector
from video_processor import VideoProcessor
from captions import CaptionProvider
from models import ProcessingResult, PLATFORM_PRESETS
from utils import setup_logging, log_structured


def parse_args():
    parser = argparse.ArgumentParser(description='Process video and generate clips')
    parser.add_argument('--job-id', required=True, help='Job ID')
    parser.add_argument('--input', required=True, help='Input video path')
    parser.add_argument('--output', required=True, help='Output directory')
    parser.add_argument('--max-clips', type=int, default=5, help='Maximum number of clips')
    parser.add_argument('--clip-duration', type=float, default=0, help='Desired clip length in seconds (e.g. 20, 30, 60)')
    parser.add_argument('--ffmpeg-path', default='ffmpeg', help='FFmpeg executable path')
    parser.add_argument('--ffprobe-path', default='ffprobe', help='FFprobe executable path')
    parser.add_argument('--transcription-provider', default='', help='Transcription provider')
    parser.add_argument('--transcription-api-key', default='', help='Transcription API key')
    parser.add_argument(
        '--platform',
        default='',
        choices=list(PLATFORM_PRESETS.keys()) + [''],
        help='Target platform: youtube_shorts, tiktok, instagram_reels, twitter'
    )
    return parser.parse_args()


def main():
    args = parse_args()

    # Setup logging
    logger = setup_logging(args.job_id)

    log_structured(
        logger,
        'info',
        'Processing started',
        job_id=args.job_id,
        input=args.input,
        output=args.output,
        platform=args.platform or 'universal'
    )

    try:
        # Initialize components
        ffmpeg = FFmpegWrapper(
            ffmpeg_path=args.ffmpeg_path,
            ffprobe_path=args.ffprobe_path
        )

        # Validate input video
        log_structured(logger, 'info', 'Probing video')

        duration = ffmpeg.get_video_duration(args.input)
        width, height = ffmpeg.get_video_dimensions(args.input)

        log_structured(
            logger,
            'info',
            'Video metadata',
            duration=duration,
            width=width,
            height=height
        )

        # Platform-aware + user-requested clip detection
        max_duration = 60.0
        min_duration = 5.0
        target_duration = 30.0
        if args.platform and args.platform in PLATFORM_PRESETS:
            preset = PLATFORM_PRESETS[args.platform]
            max_duration = float(preset['max_duration'])
            min_duration = float(preset['min_duration'])

        # User-specified clip length overrides the target and min duration
        if args.clip_duration and args.clip_duration > 0:
            target_duration = float(args.clip_duration)
            # A clip should be the requested length (allow small tolerance on min)
            min_duration = min(min_duration, target_duration * 0.5)
            # Never exceed the platform hard limit
            max_duration = min(max_duration, target_duration)

        detector = ClipDetector(
            min_duration=min_duration,
            max_duration=max_duration,
            max_clips=args.max_clips,
            target_duration=target_duration
        )

        log_structured(
            logger,
            'info',
            'Detecting candidates',
            target_duration=target_duration
        )
        candidates = detector.detect_candidates(args.input, duration)

        if not candidates:
            log_structured(logger, 'error', 'No suitable clips found')
            sys.exit(1)

        log_structured(
            logger,
            'info',
            'Candidates selected',
            count=len(candidates)
        )

        # Generate clips
        processor = VideoProcessor(ffmpeg)

        log_structured(logger, 'info', 'Generating clips')
        clips = processor.generate_clips(
            input_path=args.input,
            output_dir=args.output,
            candidates=candidates,
            job_id=args.job_id,
            platform=args.platform,
        )

        if not clips:
            log_structured(logger, 'error', 'Failed to generate clips')
            sys.exit(1)

        # Generate captions (optional)
        caption_provider = CaptionProvider(
            provider=args.transcription_provider,
            api_key=args.transcription_api_key
        )

        # Save output metadata
        output_metadata = {
            'job_id': args.job_id,
            'platform': args.platform or 'universal',
            'clips': [
                {
                    'id': clip.id,
                    'filename': clip.filename,
                    'start': clip.start,
                    'end': clip.end,
                    'duration': clip.duration,
                    'score': clip.score
                }
                for clip in clips
            ]
        }

        output_json_path = Path(args.output) / 'output.json'
        with open(output_json_path, 'w') as f:
            json.dump(output_metadata, f, indent=2)

        log_structured(
            logger,
            'info',
            'Processing completed',
            clip_count=len(clips)
        )

        sys.exit(0)

    except Exception as e:
        log_structured(
            logger,
            'error',
            'Processing failed',
            error=str(e)
        )
        sys.exit(1)


if __name__ == '__main__':
    main()
