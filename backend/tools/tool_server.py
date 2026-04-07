import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

from .tool_registry import registry
from config import settings

app = FastAPI(title="NEXUS MCP Tool Server")

class ToolCallRequest(BaseModel):
    tool_name: str
    params: Dict[str, Any]
    scenario: Dict[str, Any]
    round_num: int
    # episode_state cannot easily be sent via JSON verbatim, so we expect a dictionary we can build into an object
    # But wait! If this runs as a separate process via HTTP, we'll need to reconstruct episode_state.
    # Alternatively, the MCP server is mounted inside FastAPI or run as an Asyncio background task?
    # The spec says: "POST each tool call to MCP server". So we must pass fix_proposed / fix_correct via state dict.
    episode_state_dict: Dict[str, Any] = {}

class ToolCallResponse(BaseModel):
    result: str
    state_updates: Dict[str, Any] = {}

class FakeEpisodeState:
    def __init__(self, d: dict):
        self.fix_proposed = d.get("fix_proposed", False)
        self.fix_correct = d.get("fix_correct", False)
        self.fix_verified = d.get("fix_verified", False)

@app.post("/call", response_model=ToolCallResponse)
async def call_tool(req: ToolCallRequest):
    ep_state = FakeEpisodeState(req.episode_state_dict)
    
    result = registry.call_tool(
        name=req.tool_name,
        params=req.params,
        scenario=req.scenario,
        round_num=req.round_num,
        episode_state=ep_state
    )
    
    # Return updated state so main process can apply it
    state_updates = {
        "fix_proposed": ep_state.fix_proposed,
        "fix_correct": ep_state.fix_correct,
        "fix_verified": ep_state.fix_verified
    }
    
    return ToolCallResponse(result=result, state_updates=state_updates)

@app.get("/health")
def health_check():
    return {"status": "up"}

def run_mcp_server():
    uvicorn.run(app, host="0.0.0.0", port=settings.MCP_SERVER_PORT)

if __name__ == "__main__":
    run_mcp_server()
