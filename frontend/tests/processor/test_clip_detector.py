import unittest
from processor.models import ClipCandidate
from processor.clip_detector import ClipDetector

class TestClipDetector(unittest.TestCase):
    def setUp(self):
        self.detector = ClipDetector(
            min_duration=15.0,
            max_duration=60.0,
            max_clips=5
        )
    
    def test_clips_overlap(self):
        """Test overlap detection"""
        clip1 = ClipCandidate(start=10.0, end=40.0, duration=30.0, score=0.8)
        clip2 = ClipCandidate(start=35.0, end=65.0, duration=30.0, score=0.7)
        clip3 = ClipCandidate(start=100.0, end=130.0, duration=30.0, score=0.9)
        
        # Clips 1 and 2 overlap
        self.assertTrue(self.detector.clips_overlap(clip1, clip2))
        
        # Clips 1 and 3 don't overlap
        self.assertFalse(self.detector.clips_overlap(clip1, clip3))
    
    def test_calculate_score(self):
        """Test score calculation"""
        video_duration = 300.0  # 5 minutes
        
        # Middle of video should score higher
        middle_score = self.detector.calculate_score(135.0, 165.0, video_duration)
        edge_score = self.detector.calculate_score(10.0, 40.0, video_duration)
        
        self.assertGreater(middle_score, edge_score)
    
    def test_create_uniform_candidates(self):
        """Test uniform candidate creation"""
        video_duration = 180.0  # 3 minutes
        candidates = self.detector.create_uniform_candidates(video_duration)
        
        # Should create some candidates
        self.assertGreater(len(candidates), 0)
        
        # All candidates should be within duration limits
        for candidate in candidates:
            self.assertGreaterEqual(candidate.duration, self.detector.min_duration)
            self.assertLessEqual(candidate.duration, self.detector.max_duration)
    
    def test_rank_candidates(self):
        """Test candidate ranking"""
        candidates = [
            ClipCandidate(start=10.0, end=40.0, duration=30.0, score=0.6),
            ClipCandidate(start=100.0, end=130.0, duration=30.0, score=0.9),
            ClipCandidate(start=200.0, end=230.0, duration=30.0, score=0.7),
        ]
        
        ranked = self.detector.rank_candidates(candidates)
        
        # Should be sorted by score
        self.assertEqual(ranked[0].score, 0.9)
        self.assertLessEqual(len(ranked), self.detector.max_clips)

if __name__ == '__main__':
    unittest.main()