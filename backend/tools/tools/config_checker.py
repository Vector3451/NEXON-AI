from pydantic import BaseModel

class CheckConfigParams(BaseModel):
    service: str
    parameter: str = ""

def tool_check_config(params: dict, scenario: dict, round_num: int, episode_state=None) -> str:
    service = params.get("service", "").lower()
    parameter = params.get("parameter", "").lower()
    
    # 1. State-aware logic
    if episode_state and hasattr(episode_state, "system_state"):
        if service in episode_state.system_state:
            srv_state = episode_state.system_state[service]
            if parameter and parameter in srv_state:
                val = srv_state[parameter]
                return f"Configuration for '{parameter}' on '{service}': {val}"
            else:
                # return all config
                dump = ", ".join([f"{k}={v}" for k, v in srv_state.items() if k not in ['status', 'error_rate', 'delay_seconds', 'orders_pending', 'progress_pct']])
                return f"Configuration for '{service}': {dump}"

    # 2. Fallback to clue_map
    key = f"check_config:{service}:{parameter}" if parameter else f"check_config:{service}"
    clue_map = scenario.get("clue_map", {})
    
    if key in clue_map:
        return clue_map[key]
        
    for k, v in clue_map.items():
        if k.startswith(f"check_config:{service}"):
            return v

    return f"Configuration for '{parameter or 'all'}' on '{service}' shows standard default values."
