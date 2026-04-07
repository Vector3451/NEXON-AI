from pydantic import BaseModel

class RestartServiceParams(BaseModel):
    service: str

def tool_restart_service(params: dict, scenario: dict, round_num: int, episode_state=None) -> str:
    if not episode_state:
        return "Critical Error: Cannot track state modifications. Simulation detached."
        
    service = params.get("service", "").lower()
    sys_state = getattr(episode_state, "system_state", {})
    
    if service in sys_state:
        # We explicitly mutate the state to reflect a fresh boot, allowing graders to catch the action.
        sys_state[service]["status"] = "running"
        sys_state[service]["last_reload"] = "Just now"
        # Reset specific common degradation params
        if "error_rate" in sys_state[service]:
            sys_state[service]["error_rate"] = "0%"
            
        return f"Service '{service}' has been successfully completely restarted and flushed. Status is now nominal."
    
    return f"Failed to restart. Service '{service}' does not exist in the simulated environment."
