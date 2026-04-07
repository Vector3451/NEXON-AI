from typing import Dict, Any, List
from pydantic import BaseModel

class ToolCall(BaseModel):
    tool_name: str
    params: Dict[str, Any]

class NexusAction(BaseModel):
    agent_id: str          # "agent_a" or "agent_b"
    message: str           # investigation message
    tool_calls: List[ToolCall] = []
    confidence: float = 0.5
