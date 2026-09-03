import os
from typing import List
from scenedetect.detectors import ContentDetector
from models import ClipCandidate
from utils import log_structured
import logging

class ClipDetector:
    def __init__(
        self,
        min_duration: float = 15.0,
        max_duration: float = 60.0,
        max_clips: int = 5,
        target_duration: float = 30.0
    ):
        self.min_duration = min_duration
        self.max_duration = max_duration
        self.max_clips = max_clips
        self.target_duration = target_duration
        self.logger = logging.getLogger(__name__)

    def detect_scenes(self, video_path: str) -> List[tuple]:
        """Detect scene changes in video.

        Samples a subset of frames (frame_skip) so detection is fast even on
        long videos, while still being accurate enough to pick good cut points.
        """
        try:
            from scenedetect import open_video, SceneManager
            from scenedetect.detectors import ContentDetector

            video = open_video(str(video_path))
            video.reset()

            # Estimate a frame_skip based on the video length so detection stays
            # fast even on long videos. We sample roughly 2 frames per second.
            duration_sec = float(video.duration.get_seconds()) if video.duration else 0.0
            frame_rate = float(video.frame_rate) if video.frame_rate else 30.0
            # Sample ~2 frames/second -> ~15x faster on a 30fps source.
            frame_skip = max(0, int(frame_rate / 2.0) - 1)

            scene_manager = SceneManager()
            scene_manager.add_detector(
                ContentDetector(
                    threshold=27.0,
                    min_scene_len=int(self.min_duration * frame_rate),
                )
            )

            scene_manager.detect_scenes(
                video,
                show_progress=False,
                frame_skip=frame_skip,
            )

            scene_list = scene_manager.get_scene_list()

            # Release the capture source (some backends expose release/close).
            for method in ('release', 'close'):
                if hasattr(video, method):
                    try:
                        getattr(video, method)()
                    except Exception:
                        pass
                    break

            log_structured(
                self.logger,
                'info',
                'Scene detection sampled',
                frames_skipped=frame_skip,
                duration_sec=round(duration_sec, 1),
                scenes=len(scene_list),
            )

            return scene_list
        except Exception as e:
            log_structured(
                self.logger,
                'error',
                'Scene detection failed',
                error=str(e)
            )
            return []
    
    def create_candidates_from_scenes(
        self,
        scenes: List[tuple],
        video_duration: float
    ) -> List[ClipCandidate]:
        """Create clip candidates from detected scenes"""
        candidates = []
        
        if not scenes:
            # If no scenes detected, create segments from the video
            return self.create_uniform_candidates(video_duration)
        
        # Merge consecutive scenes to create clips of the target duration
        i = 0
        while i < len(scenes):
            start_time = scenes[i][0].get_seconds()
            # Aim for the target duration (or as close as possible)
            target_end = start_time + self.target_duration
            end_time = None
            j = i

            # Find the scene boundary nearest to the target end
            best_j = i
            best_diff = float('inf')
            while j < len(scenes):
                candidate_end = scenes[j][1].get_seconds()
                diff = abs(candidate_end - target_end)
                if diff < best_diff:
                    best_diff = diff
                    best_j = j
                j += 1

            end_time = scenes[best_j][1].get_seconds()

            # Clamp to max duration
            if end_time - start_time > self.max_duration:
                end_time = start_time + self.max_duration

            duration = end_time - start_time

            # Only add if duration is acceptable
            if self.min_duration <= duration <= self.max_duration:
                score = self.calculate_score(start_time, end_time, video_duration)
                candidates.append(ClipCandidate(
                    start=start_time,
                    end=end_time,
                    duration=duration,
                    score=score
                ))

            i = best_j + 1 if best_j > i else i + 1

        return candidates
    
    def create_uniform_candidates(self, video_duration: float) -> List[ClipCandidate]:
        """Create uniformly distributed candidates when scene detection fails"""
        candidates = []
        target_duration = self.target_duration

        # Skip first and last few seconds (proportional to target length)
        start_offset = min(10.0, video_duration * 0.1)
        end_offset = min(10.0, video_duration * 0.1)

        usable_duration = video_duration - start_offset - end_offset

        if usable_duration < self.min_duration:
            # Video too short, use entire video
            if video_duration >= self.min_duration:
                candidates.append(ClipCandidate(
                    start=0,
                    end=min(video_duration, self.max_duration),
                    duration=min(video_duration, self.max_duration),
                    score=0.5
                ))
            return candidates

        # Create clips at regular intervals, each of the target duration
        num_clips = min(self.max_clips, max(1, int(usable_duration / target_duration)))
        interval = usable_duration / (num_clips + 1)

        for i in range(num_clips):
            start = start_offset + interval * (i + 1) - (target_duration / 2)
            start = max(start_offset, start)
            end = min(start + target_duration, video_duration - end_offset)
            duration = end - start

            if duration >= self.min_duration:
                score = self.calculate_score(start, end, video_duration)
                candidates.append(ClipCandidate(
                    start=start,
                    end=end,
                    duration=duration,
                    score=score
                ))

        return candidates
    
    def calculate_score(
        self,
        start: float,
        end: float,
        video_duration: float
    ) -> float:
        """
        Calculate a score for a clip candidate.
        Higher score = better candidate.
        """
        score = 0.5  # Base score
        
        # Prefer clips from the middle of the video
        middle = video_duration / 2
        clip_middle = (start + end) / 2
        distance_from_middle = abs(clip_middle - middle)
        middle_score = 1.0 - (distance_from_middle / (video_duration / 2))
        score += middle_score * 0.2
        
        # Prefer clips with duration matching the target
        duration = end - start
        target = self.target_duration
        # Perfect match adds 0.3, scaling down with deviation
        ratio = duration / target if target else 1.0
        duration_score = max(0.0, 0.3 * (1.0 - abs(ratio - 1.0)))
        score += duration_score

        return min(1.0, score)
    
    def rank_candidates(self, candidates: List[ClipCandidate]) -> List[ClipCandidate]:
        """Rank and filter candidates"""
        # Sort by score descending
        sorted_candidates = sorted(candidates, key=lambda c: c.score, reverse=True)
        
        # Remove overlapping candidates
        final_candidates = []
        for candidate in sorted_candidates:
            if len(final_candidates) >= self.max_clips:
                break
            
            # Check for overlap with already selected candidates
            overlaps = False
            for selected in final_candidates:
                if self.clips_overlap(candidate, selected):
                    overlaps = True
                    break
            
            if not overlaps:
                final_candidates.append(candidate)
        
        return final_candidates
    
    def clips_overlap(self, clip1: ClipCandidate, clip2: ClipCandidate) -> bool:
        """Check if two clips overlap significantly"""
        overlap_start = max(clip1.start, clip2.start)
        overlap_end = min(clip1.end, clip2.end)
        overlap_duration = max(0, overlap_end - overlap_start)
        
        # Consider overlapping if more than 20% of either clip overlaps
        min_duration = min(clip1.duration, clip2.duration)
        return overlap_duration > (min_duration * 0.2)
    
    def detect_candidates(self, video_path: str, video_duration: float) -> List[ClipCandidate]:
        """Main method to detect clip candidates"""
        log_structured(
            self.logger,
            'info',
            'Detecting scenes',
            video_path=video_path
        )
        
        scenes = self.detect_scenes(video_path)
        
        log_structured(
            self.logger,
            'info',
            'Scenes detected',
            scene_count=len(scenes)
        )
        
        candidates = self.create_candidates_from_scenes(scenes, video_duration)
        
        log_structured(
            self.logger,
            'info',
            'Candidates created',
            candidate_count=len(candidates)
        )
        
        ranked = self.rank_candidates(candidates)
        
        log_structured(
            self.logger,
            'info',
            'Candidates ranked',
            final_count=len(ranked)
        )
        
        return ranked