from typing import List, Dict, Optional
import logging
from utils import log_structured

class CaptionProvider:
    """
    Abstract caption provider interface.
    
    This is designed to be extended with actual transcription services like:
    - Whisper (local)
    - OpenAI Whisper API
    - Other speech-to-text services
    """
    
    def __init__(self, provider: str = '', api_key: str = ''):
        self.provider = provider
        self.api_key = api_key
        self.logger = logging.getLogger(__name__)
    
    def transcribe(self, audio_path: str) -> List[Dict[str, any]]:
        """
        Transcribe audio file and return timestamped segments.
        
        Returns:
            List of segments with format:
            [
                {
                    'start': 0.0,
                    'end': 2.5,
                    'text': 'Hello world'
                },
                ...
            ]
        """
        if not self.provider:
            log_structured(
                self.logger,
                'info',
                'No transcription provider configured, skipping captions'
            )
            return []
        
        # Future implementation would call actual transcription service here
        log_structured(
            self.logger,
            'warn',
            'Transcription provider not implemented yet',
            provider=self.provider
        )
        
        return []
    
    def create_srt(self, segments: List[Dict[str, any]], output_path: str) -> bool:
        """Create SRT subtitle file from segments"""
        if not segments:
            return False
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                for idx, segment in enumerate(segments):
                    start = self._format_timestamp(segment['start'])
                    end = self._format_timestamp(segment['end'])
                    text = segment['text'].strip()
                    
                    f.write(f"{idx + 1}\n")
                    f.write(f"{start} --> {end}\n")
                    f.write(f"{text}\n\n")
            
            return True
        except Exception as e:
            log_structured(
                self.logger,
                'error',
                'Failed to create SRT file',
                error=str(e)
            )
            return False
    
    def _format_timestamp(self, seconds: float) -> str:
        """Format seconds as SRT timestamp (HH:MM:SS,mmm)"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"