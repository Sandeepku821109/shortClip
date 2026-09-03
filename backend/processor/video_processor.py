import os
from typing import List
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
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
        """Generate video clips from candidates, optimized for target platform.

        Clips are encoded in parallel (using a thread pool; each clip runs a
        separate ffmpeg subprocess) so the total time is roughly the time of the
        slowest single clip instead of the sum of all clips.
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Prepare per-clip tasks
        tasks = []
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

            tasks.append({
                'clip_id': clip_id,
                'filename': filename,
                'output_file': str(output_file),
                'start': candidate.start,
                'end': candidate.end,
                'duration': duration,
                'score': candidate.score,
            })

        # Run clips in parallel. Limit to available CPUs (each clip runs its own
        # ffmpeg process). On single-core machines this degrades to sequential.
        import os as _os
        cpu_count = _os.cpu_count() or 1
        max_workers = min(len(tasks), max(1, cpu_count))
        clips: List[ClipOutput] = []

        def render_one(task):
            return self._render_clip(input_path, task, platform)

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(render_one, t): t for t in tasks}

            for future in as_completed(futures):
                task = futures[future]
                try:
                    result = future.result()
                    if result:
                        clips.append(result)
                except Exception as e:
                    log_structured(
                        self.logger,
                        'error',
                        'Clip generation error',
                        clip_id=task['clip_id'],
                        error=str(e),
                    )

        # Sort clips back into the original candidate order for stable output
        clips.sort(key=lambda c: int(c.id.rsplit('-', 1)[-1]))
        return clips

    def _render_clip(
        self,
        input_path: str,
        task: dict,
        platform: str,
    ) -> ClipOutput | None:
        log_structured(
            self.logger,
            'info',
            'Generating clip',
            clip_id=task['clip_id'],
            start=task['start'],
            end=task['end'],
            duration=task['duration'],
            platform=platform or 'universal'
        )

        success = self.ffmpeg.extract_clip(
            input_path=input_path,
            output_path=task['output_file'],
            start=task['start'],
            duration=task['duration'],
            platform=platform,
        )

        if success:
            log_structured(
                self.logger,
                'info',
                'Clip generated successfully',
                clip_id=task['clip_id'],
                filename=task['filename']
            )
            return ClipOutput(
                id=task['clip_id'],
                filename=task['filename'],
                start=task['start'],
                end=task['start'] + task['duration'],
                duration=task['duration'],
                score=task['score']
            )

        log_structured(
            self.logger,
            'error',
            'Failed to generate clip',
            clip_id=task['clip_id']
        )
        return None
