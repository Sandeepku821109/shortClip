import subprocess
import sys
from pathlib import Path
from typing import Optional
from utils import log_structured
import logging


class Downloader:
    """Download a remote video URL to a local file using yt-dlp."""

    def __init__(self, ytdlp_path: str = 'yt-dlp'):
        self.ytdlp_path = ytdlp_path
        self.logger = logging.getLogger(__name__)

    def is_available(self) -> bool:
        try:
            result = subprocess.run(
                [self.ytdlp_path, '--version'],
                capture_output=True,
                text=True,
                timeout=30,
            )
            return result.returncode == 0
        except Exception:
            return False

    def download(self, url: str, output_dir: str, output_base: str = 'source') -> Optional[str]:
        """Download a video from a URL into output_dir. Returns the local path."""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        output_template = str(output_dir / f'{output_base}.%(ext)s')

        cmd = [
            self.ytdlp_path,
            '--newline',
            '--no-playlist',
            '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '--merge-output-format', 'mp4',
            '--output', output_template,
            '--no-mtime',
            '--no-warnings',
            url,
        ]

        log_structured(
            self.logger,
            'info',
            'Downloading video',
            url=url,
            output_dir=str(output_dir),
        )

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600,
            )
        except Exception as e:
            log_structured(
                self.logger,
                'error',
                'Download failed (could not run yt-dlp)',
                error=str(e),
            )
            return None

        if result.returncode != 0:
            log_structured(
                self.logger,
                'error',
                'Download failed',
                stderr=result.stderr[-500:],
            )
            return None

        # Find produced file
        for f in output_dir.iterdir():
            if f.name.startswith(output_base):
                log_structured(
                    self.logger,
                    'info',
                    'Download complete',
                    file=f.name,
                    size=f.stat().st_size,
                )
                return str(f)

        return None
