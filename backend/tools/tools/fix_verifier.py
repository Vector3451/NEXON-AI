from pydantic import BaseModel

class VerifyFixParams(BaseModel):
    pass

def tool_verify_fix(params: dict, scenario: dict, round_num: int, episode_state=None) -> str:
    if not episode_state or not episode_state.fix_proposed:
        return "You cannot verify a fix before proposing one. Use propose_fix first."
        
    if getattr(episode_state, "fix_correct", False):
        episode_state.fix_verified = True
        return "Fix Verified! The system has returned to a healthy state. The incident is considered resolved."
    else:
        return "Verification failed! The proposed fix did not resolve the symptoms. The root cause is still active."
