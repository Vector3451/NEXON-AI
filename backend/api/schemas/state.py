from typing import List, Dict
from pydantic import BaseModel

class NexusState(BaseModel):
    episode_id: str
    scenario_id: str
    task: str
    difficulty: str
    current_round: int
    max_rounds: int
    agent_a_messages: List[str]
    agent_b_messages: List[str]
    tool_calls_made: List[Dict]
    clues_found: List[str]
    root_cause_found: bool
    fix_proposed: bool
    fix_verified: bool
    cumulative_reward: float
    reward_history: List[float]
    done: bool
    investigation_stage: str
