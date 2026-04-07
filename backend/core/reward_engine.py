from utils.embeddings import get_embedding, cos_sim
import logging

logger = logging.getLogger("nexus.reward_engine")

def compute_reward(message: str, tool_calls: list, tool_results: list, episode_state, scenario: dict) -> tuple[float, dict]:
    breakdown = {}
    
    msg_lower = message.lower()
    
    ep = episode_state
    sc = scenario
    
    # 1. HYPOTHESIS SPECIFICITY (0.0-0.20)
    specificity_indicators = ["shows", "value", "config", "log", "found", "confirmed", 
                               "set to", "equals", "returns", "indicates", "trace", "root cause"]
    breakdown['specificity'] = min(0.20, 
        sum(0.025 for word in specificity_indicators if word in msg_lower)
    )
    
    # 2. TOOL EXECUTION SUCCESS (0.0-0.25)
    tool_score = 0.0
    if tool_calls:
        new_tools = 0
        for t in tool_calls:
            sig = f"{t.tool_name}:{str(t.params)}"
            if sig not in ep.previous_tool_calls:
                new_tools += 1
        
        # Reward for using different tool categories
        tool_categories = set()
        for tc in tool_calls:
            if tc.tool_name in ["read_logs", "check_config", "query_database", "check_service_status"]:
                tool_categories.add("investigation")
            elif tc.tool_name in ["update_config", "restart_service"]:
                tool_categories.add("fix_action")
            elif tc.tool_name in ["propose_fix", "verify_fix"]:
                tool_categories.add("resolution")
        
        tool_score = min(0.25, len(tool_categories) * 0.08 + new_tools * 0.05)
    breakdown['tool_usage'] = tool_score
    
    # 3. TOOL RESULT QUALITY (0.0-0.15)
    result_score = 0.0
    for tr in tool_results:
        result_text = tr.get('result', '').lower() if isinstance(tr, dict) else str(tr).lower()
        # Positive signals in tool results
        if any(kw in result_text for kw in ['error', 'fail', 'degraded', 'anomaly', 'threshold']):
            result_score += 0.03  # Found something useful
        if any(kw in result_text for kw in ['rate_limit', 'nginx', 'config', 'timeout', 'connection']):
            result_score += 0.02  # Found relevant clue
        if 'success' in result_text or 'running' in result_text or 'healthy' in result_text:
            result_score += 0.01  # Status info
    breakdown['result_quality'] = min(0.15, result_score)
    
    # 4. CLUE DISCOVERY (0.0-0.20)
    clue_score = 0.0
    if hasattr(ep, 'clues_found') and ep.clues_found:
        clue_score = min(0.20, len(ep.clues_found) * 0.05)
    breakdown['clue_discovery'] = clue_score
    
    # 5. INVESTIGATION STAGE PROGRESS (0.0-0.15)
    stage_score = 0.0
    if hasattr(ep, 'investigation_stage'):
        stage_map = {'investigating': 0.02, 'narrowing': 0.08, 'hypothesizing': 0.12, 'found': 0.15, 'verified': 0.15}
        stage_score = stage_map.get(ep.investigation_stage, 0.02)
    breakdown['stage_progress'] = stage_score
    
    # 6. SEMANTIC SIMILARITY TO ROOT CAUSE (0.0-0.10)
    similarity_score = 0.0
    try:
        root_cause_desc = scenario.get('root_cause', {}).get('description', '')
        if root_cause_desc:
            msg_emb = get_embedding(message)
            rc_emb = get_embedding(root_cause_desc)
            sim = cos_sim(msg_emb, rc_emb)
            # Only reward if embedding is not fallback (has meaningful variance)
            if len(msg_emb) == 384 and sum(msg_emb) != 0:
                similarity_score = min(0.10, sim * 0.15)
    except:
        pass
    breakdown['semantic_similarity'] = similarity_score
    
    # 7. NOVELTY BONUS (0.0-0.05)
    novelty_score = 0.0
    if hasattr(ep, 'all_messages') and ep.all_messages:
        try:
            msg_emb = get_embedding(message)
            max_sim = 0
            for prev in ep.all_messages[-3:]:
                prev_emb = get_embedding(prev)
                sim = cos_sim(msg_emb, prev_emb)
                max_sim = max(max_sim, sim)
            novelty_score = max(0.0, 0.05 * (1 - max_sim))
        except:
            novelty_score = 0.03
    else:
        novelty_score = 0.05
    breakdown['novelty'] = novelty_score
    
    # PENALTIES
    penalty = 0.0
    msg_len = len(message.split())
    if msg_len < 5:
        penalty += 0.10  # Too terse
    if len(message) > 2000:
        penalty += 0.05  # Too verbose without action
    if breakdown['novelty'] < 0.01:
        penalty += 0.10  # Circular/duplicate message
        
    total = sum(breakdown.values()) - penalty
    final_score = round(max(0.0, min(1.0, total)), 4)
    
    ep.reward_history.append(final_score)
    ep.cumulative_reward += final_score
    
    return final_score, breakdown
