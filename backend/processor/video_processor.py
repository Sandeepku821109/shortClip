import os
from typing import List
from pathlib import Path
from models import ClipCandidate, ClipOutput, PLATFORM_PRESETS
from ffmpeg_wrapper import FFmpegWrapper
from utils import log_structured
import logging


class VideoProcessor:
    def __init__(self, ffmpeg_wrapper: FFmpegWrapper):
        self.ffmpeg = ffmpeg_wrapper
        self.logger = logging.getLogger(__name__)

    def generate_clips(
        self,
        input_path: str,
        output_dir: str,
        candidates: List[ClipCandidate],
        job_id: str,
        platform: str = '',
    ) -> List[ClipOutput]:
        """Generate video clips from candidates, optimized for target platform"""

        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        clips = []

        for idx, candidate in enumerate(candidates):
            clip_id = f"{job_id}-{idx}"
            filename = f"clip-{idx}.mp4"
            output_file = output_path / filename

            # Respect platform max duration
            duration = candidate.duration
            if platform and platform in PLATFORM_PRESETS:
                max_dur = PLATFORM_PRESETS[platform]['max_duration']
                if duration > max_dur:
                    duration = max_dur

            log_structured(
                self.logger,
                'info',
                'Generating clip',
                clip_id=clip_id,
                start=candidate.start,
                end=candidate.end,
                duration=duration,
                platform=platform or 'universal'
            )

            success = self.ffmpeg.extract_clip(
                input_path=input_path,
                output_path=str(output_file),
                start=candidate.start,
                duration=duration,
                platform=platform,
            )

            if success:
                clips.append(ClipOutput(
                    id=clip_id,
                    filename=filename,
                    start=candidate.start,
                    end=candidate.start + duration,
                    duration=duration,
                    score=candidate.score
                ))

                log_structured(
                    self.logger,
                    'info',
                    'Clip generated successfully',
                    clip_id=clip_id,
                    filename=filename
                )
            else:
                log_structured(
                    self.logger,
                    'error',
                    'Failed to generate clip',
                    clip_id=clip_id
                )

        return clips
