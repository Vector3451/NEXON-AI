from pydantic import BaseModel
from utils.embeddings import get_embedding, cos_sim

class ProposeFixParams(BaseModel):
    description: str
    target: str

def tool_propose_fix(params: dict, scenario: dict, round_num: int, episode_state=None) -> str:
    description = params.get("description", "").lower()
    
    correct_fix = scenario.get("correct_fix", {})
    fix_keywords = correct_fix.get("fix_keywords", [])
    
    if not description:
        return "You must provide a description of the fix."
        
    keyword_matches = sum(1 for kw in fix_keywords if kw.lower() in description)
    
    is_correct = False
    
    # 1. Keyword check
    if len(fix_keywords) > 0 and keyword_matches >= max(1, len(fix_keywords) // 2):
        is_correct = True
        
    # 2. Semantic check (fallback/enhancement)
    if not is_correct:
        target_embedding = get_embedding(correct_fix.get("description", ""))
        desc_embedding = get_embedding(description)
        sim = cos_sim(desc_embedding, target_embedding)
        if sim >= 0.65:
            is_correct = True

    if episode_state:
        episode_state.fix_proposed = True
        if is_correct:
            episode_state.fix_correct = True

    if is_correct:
        return "Fix accepted as a potential solution. You must now run verify_fix() to ensure it resolves the root cause."
    else:
        return "Fix proposed. However, it does not seem to accurately address the root cause of the incident. Investigation should continue."
