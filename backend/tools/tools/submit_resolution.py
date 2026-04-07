from pydantic import BaseModel

class SubmitResolutionParams(BaseModel):
    root_cause_service: str
    root_cause_description: str
    fix_applied: str

def tool_submit_resolution(params: dict, scenario: dict, round_num: int, episode_state) -> str:
    service = params.get("root_cause_service", "")
    desc = params.get("root_cause_description", "")
    fix = params.get("fix_applied", "")
    
    if not service or not desc or not fix:
         return "Error: submit_resolution requires root_cause_service, root_cause_description, and fix_applied parameters."
         
    # Check if this tool has already been called
    if getattr(episode_state, "fix_verified", False):
        return "Error: Resolution has already been submitted for this episode."

    # In Option B, calling this tool formally marks the episode as concluded and verified.
    # The true accuracy of the fix is still evaluated by the Graders against the actual system_state.
    episode_state.fix_verified = True
    
    # Return a structured Markdown block that the frontend can render nicely
    return f"""### 🛡️ INCIDENT RESOLUTION SUBMITTED

**Root Cause Service:** `{service}`
**Root Cause Hypothesis:** {desc}
**Fix Applied:** {fix}

**System Status:** The submit_resolution tool has successfully logged this post-mortem. The episode will now conclude and automated grading will commence against the final system state."""
