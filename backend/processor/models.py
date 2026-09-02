from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


# Platform-specific presets for social media short clips
PLATFORM_PRESETS: Dict[str, Dict[str, Any]] = {
    'youtube_shorts': {
        'name': 'YouTube Shorts',
        'width': 1080,
        'height': 1920,
        'max_duration': 60,
        'min_duration': 5,
        'codec': 'libx264',
        'crf': 20,
        'preset': 'slow',
        'audio_bitrate': '192k',
        'audio_codec': 'aac',
        'frame_rate': 30,
        'pix_fmt': 'yuv420p',
        'movflags': '+faststart',
        'extra_flags': ['-tune', 'fastdecode'],
    },
    'tiktok': {
        'name': 'TikTok',
        'width': 1080,
        'height': 1920,
        'max_duration': 60,
        'min_duration': 5,
        'codec': 'libx264',
        'crf': 22,
        'preset': 'medium',
        'audio_bitrate': '128k',
        'audio_codec': 'aac',
        'frame_rate': 30,
        'pix_fmt': 'yuv420p',
        'movflags': '+faststart',
        'extra_flags': [],
    },
    'instagram_reels': {
        'name': 'Instagram Reels',
        'width': 1080,
        'height': 1920,
        'max_duration': 90,
        'min_duration': 5,
        'codec': 'libx264',
        'crf': 22,
        'preset': 'medium',
        'audio_bitrate': '128k',
        'audio_codec': 'aac',
        'frame_rate': 30,
        'pix_fmt': 'yuv420p',
        'movflags': '+faststart',
        'extra_flags': [],
    },
    'twitter': {
        'name': 'Twitter / X',
        'width': 1080,
        'height': 1920,
        'max_duration': 140,
        'min_duration': 5,
        'codec': 'libx264',
        'crf': 23,
        'preset': 'medium',
        'audio_bitrate': '128k',
        'audio_codec': 'aac',
        'frame_rate': 30,
        'pix_fmt': 'yuv420p',
        'movflags': '+faststart',
        'extra_flags': [],
    },
}

# Default vertical format (compatible with all platforms)
DEFAULT_PRESET = {
    'name': 'Universal Vertical',
    'width': 1080,
    'height': 1920,
    'max_duration': 60,
    'min_duration': 5,
    'codec': 'libx264',
    'crf': 23,
    'preset': 'medium',
    'audio_bitrate': '128k',
    'audio_codec': 'aac',
    'frame_rate': 30,
    'pix_fmt': 'yuv420p',
    'movflags': '+faststart',
    'extra_flags': [],
}


def get_platform_preset(platform: str) -> Dict[str, Any]:
    """Get encoding preset for a given platform"""
    return PLATFORM_PRESETS.get(platform, DEFAULT_PRESET)


@dataclass
class ClipCandidate:
    start: float
    end: float
    duration: float
    score: float

@dataclass
class ClipOutput:
    id: str
    filename: str
    start: float
    end: float
    duration: float
    score: float

@dataclass
class ProcessingResult:
    success: bool
    clips: List[ClipOutput]
    error: Optional[str] = None
