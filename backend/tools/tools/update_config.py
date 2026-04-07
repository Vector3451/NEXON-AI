from pydantic import BaseModel

class UpdateConfigParams(BaseModel):
    service: str
    parameter: str
    new_value: str

def tool_update_config(params: dict, scenario: dict, round_num: int, episode_state=None) -> str:
    if not episode_state:
        return "Critical Error: Cannot track state modifications. Simulation detached."
        
    service = params.get("service", "").lower()
    parameter = params.get("parameter", "").lower()
    new_value = params.get("new_value", "")
    
    sys_state = getattr(episode_state, "system_state", {})
    
    if service in sys_state:
        # We inject the new variable to actually simulate the new parameter configuration
        sys_state[service][parameter] = new_value
        return f"Successfully updated configuration. '{parameter}' on '{service}' is now set to '{new_value}'."
    
    return f"Failed to update configuration. Service '{service}' could not be located in the system architecture."
