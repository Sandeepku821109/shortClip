import logging
import sys
import json
from datetime import datetime

def setup_logging(job_id: str):
    """Setup structured logging"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(message)s',
        stream=sys.stdout
    )
    return logging.getLogger(job_id)

def log_structured(logger, level: str, message: str, **kwargs):
    """Log structured JSON messages"""
    log_data = {
        'level': level,
        'message': message,
        'timestamp': datetime.utcnow().isoformat(),
        **kwargs
    }
    logger.info(json.dumps(log_data))

def format_timestamp(seconds: float) -> str:
    """Format seconds as HH:MM:SS.mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"