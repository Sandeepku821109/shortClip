import subprocess
import json
import os
from typing import Dict, Any, List, Optional
from pathlib import Path
from models import get_platform_preset, PLATFORM_PRESETS


class FFmpegWrapper:
    def __init__(self, ffmpeg_path: str = 'ffmpeg', ffprobe_path: str = 'ffprobe'):
        self.ffmpeg_path = ffmpeg_path
        self.ffprobe_path = ffprobe_path

    def probe_video(self, video_path: str) -> Dict[str, Any]:
        """Get video metadata using ffprobe"""
        cmd = [
            self.ffprobe_path,
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            video_path
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)

    def get_video_duration(self, video_path: str) -> float:
        """Get video duration in seconds"""
        metadata = self.probe_video(video_path)
        return float(metadata['format']['duration'])

    def get_video_dimensions(self, video_path: str) -> tuple:
        """Get video width and height"""
        metadata = self.probe_video(video_path)

        video_stream = None
        for stream in metadata['streams']:
            if stream['codec_type'] == 'video':
                video_stream = stream
                break

        if not video_stream:
            raise ValueError('No video stream found')

        width = int(video_stream['width'])
        height = int(video_stream['height'])
        return width, height

    def extract_clip(
        self,
        input_path: str,
        output_path: str,
        start: float,
        duration: float,
        width: int = 1080,
        height: int = 1920,
        platform: str = '',
        add_captions: bool = False,
        subtitle_file: Optional[str] = None
    ) -> bool:
        """Extract and convert clip to vertical format with platform optimization"""

        # Get platform preset
        if platform and platform in PLATFORM_PRESETS:
            preset = PLATFORM_PRESETS[platform]
        else:
            from models import DEFAULT_PRESET
            preset = DEFAULT_PRESET

        width = preset['width']
        height = preset['height']

        # Build video filter chain
        filters = []

        # Scale to fill height, then center-crop to exact dimensions
        filters.append(
            f"scale='if(gt(a,{width}/{height}),{height}*dar,{width})':"
            f"'if(gt(a,{width}/{height}),{height},{width}/dar)'"
        )
        filters.append(f"crop={width}:{height}")

        # Ensure pixel format compatibility
        filters.append(f"format={preset['pix_fmt']}")

        filter_chain = ','.join(filters)

        # Build ffmpeg command
        cmd = [
            self.ffmpeg_path,
            '-y',
            '-ss', str(start),
            '-t', str(duration),
            '-i', input_path,
        ]

        # Video filter and encoding
        cmd.extend([
            '-vf', filter_chain,
            '-c:v', preset['codec'],
            '-preset', preset['preset'],
            '-crf', str(preset['crf']),
        ])

        # Frame rate
        if preset.get('frame_rate'):
            cmd.extend(['-r', str(preset['frame_rate'])])

        # Audio encoding
        cmd.extend([
            '-c:a', preset['audio_codec'],
            '-b:a', preset['audio_bitrate'],
        ])

        # Platform-specific extra flags
        if preset.get('extra_flags'):
            cmd.extend(preset['extra_flags'])

        # movflags for fast start (important for streaming)
        cmd.extend(['-movflags', preset['movflags']])

        # Strip all metadata for copyright-free output
        # This removes embedded watermarks, GPS data, device info, etc.
        cmd.extend([
            '-map_metadata', '-1',       # Remove all global metadata
            '-map_chapters', '-1',       # Remove chapters
            '-fflags', '+bitexact',      # Bit-exact output
        ])

        # Add captions as burned-in subtitles if provided
        if add_captions and subtitle_file and os.path.exists(subtitle_file):
            cmd.extend([
                '-vf', f"{filter_chain},subtitles='{subtitle_file}':"
                       f"force_style='FontSize=20,PrimaryColour=&H00FFFFFF,"
                       f"OutlineColour=&H00000000,BorderStyle=3,Outline=2'"
            ])

        cmd.append(output_path)

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )

        return result.returncode == 0

    def extract_audio(self, video_path: str, audio_path: str) -> bool:
        """Extract audio from video"""
        cmd = [
            self.ffmpeg_path,
            '-y',
            '-i', video_path,
            '-vn',
            '-acodec', 'pcm_s16le',
            '-ar', '16000',
            '-ac', '1',
            audio_path
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.returncode == 0

    def get_available_platforms(self) -> List[Dict[str, Any]]:
        """Return info about all available platform presets"""
        platforms = []
        for key, preset in PLATFORM_PRESETS.items():
            platforms.append({
                'id': key,
                'name': preset['name'],
                'width': preset['width'],
                'height': preset['height'],
                'max_duration': preset['max_duration'],
            })
        return platforms
