from typing import Dict
from pydantic import BaseModel

class NexusReward(BaseModel):
    total: float
    breakdown: Dict[str, float]
    feedback: str
