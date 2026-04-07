from typing import Dict, Any, List
from pydantic import BaseModel

class ToolResult(BaseModel):
    tool_name: str
    result: str
    success: bool

class NexusObservation(BaseModel):
    partner_message: str
    tool_results: List[ToolResult] = []
    system_state: Dict[str, Any]
    investigation_stage: str    # investigating/narrowing/found/verified
    round: int
    available_tools: List[str]
    clues_found: List[str] = []
    scenario_description: str
    scenario_context: str
