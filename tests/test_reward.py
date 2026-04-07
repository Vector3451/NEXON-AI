import pytest
from unittest.mock import patch
from core.reward_engine import compute_reward

def test_reward_engine_basic():
    # Mock episode state
    class MockEpisode:
        def __init__(self):
            self.all_messages = ["Hello partner, let's investigate the Nginx 503 error."]
            self.clues_found = []
            self.previous_tool_calls = []
            self.steps_taken = 1
            self.difficulty = "easy"
            self.last_partner_message = "What do you see?"
            self.reward_history = []
            self.cumulative_reward = 0.0

    ep = MockEpisode()
    
    # Mock embeddings to avoid needing a server
    with patch('core.reward_engine.get_embedding', return_value=[0.1]*384), \
         patch('core.reward_engine.cos_sim', return_value=0.8):
         
        final_score, info = compute_reward(
            message="I will check the configuration file /etc/nginx/nginx.conf",
            tool_calls=[],
            tool_results=[],
            episode_state=ep,
            scenario={"root_cause": {"description": "Nginx rate limit"}}
        )
    
        assert 0.0 <= final_score <= 1.0
        assert "specificity" in info
        assert "progress" in info
