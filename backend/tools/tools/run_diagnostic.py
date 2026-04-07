from pydantic import BaseModel

class RunDiagnosticParams(BaseModel):
    component: str

def tool_run_diagnostic(params: dict, scenario: dict, round_num: int) -> str:
    component = params.get("component", "").lower()
    key = f"run_diagnostic:{component}"
    
    clue_map = scenario.get("clue_map", {})
    if key in clue_map:
        return clue_map[key]
        
    return f"Diagnostic completely successful for '{component}'. All health checks passed. Performance metrics nominal."
