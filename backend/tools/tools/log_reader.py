from pydantic import BaseModel

class ReadLogsParams(BaseModel):
    service: str
    time_range: str = "last_24h"

def _is_service_healthy(service: str, scenario: dict, episode_state) -> bool:
    target_state = scenario.get("target_state", {})
    if not episode_state or not hasattr(episode_state, "system_state"):
        return False
    if service not in target_state:
        # If it has no target state, we assume it depends on other services or is naturally healthy
        return False
    
    current_state = episode_state.system_state.get(service, {})
    for k, v in target_state[service].items():
        if k not in current_state or current_state[k] != v:
            return False
            
    # Check if a reload was done (basic check: status is running)
    if "status" in current_state and "running" in current_state["status"]:
        return True
    return False

def tool_read_logs(params: dict, scenario: dict, round_num: int, episode_state=None) -> str:
    service = params.get("service", "").lower()
    
    # 1. State-aware logic
    if _is_service_healthy(service, scenario, episode_state):
        return f"INFO: [Current] No anomalies found in logs for {service}. Service is operating normally."
        
    # Check if a cascading upstream service was fixed (like DB holding everything)
    target_state = scenario.get("target_state", {})
    all_targets_met = True
    for tsrv, tconf in target_state.items():
        cconf = episode_state.system_state.get(tsrv, {}) if episode_state and hasattr(episode_state, "system_state") else {}
        for k, v in tconf.items():
            if cconf.get(k) != v:
                all_targets_met = False
                
    if all_targets_met:
         # If all root causes are fixed globally, everything is healthy
         return f"INFO: [Current] Service {service} connection restored. Operating normally."

    # 2. Fallback to clue_map errors
    key = f"read_logs:{service}"
    clue_map = scenario.get("clue_map", {})
    if key in clue_map:
        return clue_map[key]
    
    return f"No anomalies found in logs for service: {service}."
