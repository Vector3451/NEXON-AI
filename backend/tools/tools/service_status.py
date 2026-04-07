from pydantic import BaseModel

class ServiceStatusParams(BaseModel):
    service: str

def tool_check_service_status(params: dict, scenario: dict, round_num: int) -> str:
    service = params.get("service", "").lower()
    key = f"check_service_status:{service}"
    
    clue_map = scenario.get("clue_map", {})
    if key in clue_map:
        return clue_map[key]
        
    return f"STATUS: UP | Service '{service}' is running normally. No warnings or errors."
