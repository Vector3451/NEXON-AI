from utils.embeddings import get_embedding, cos_sim
import logging

logger = logging.getLogger("nexus.reward_engine")

def compute_reward(message: str, tool_calls: list, tool_results: list, episode_state, scenario: dict) -> tuple[float, dict]:
    breakdown = {}
    
    msg_lower = message.lower()

    # 1. HYPOTHESIS SPECIFICITY (0.0-0.25)
    specificity_indicators = ["shows", "value", "config", "log", "found", "confirmed", 
                               "set to", "equals", "returns", "indicates"]
    breakdown['specificity'] = min(0.25, 
        sum(0.025 for word in specificity_indicators if word in msg_lower)
    )

    # 2. PARTNER ENGAGEMENT (0.0-0.20)
    if episode_state.last_partner_message:
        sim = cos_sim(
            get_embedding(message),
            get_embedding(episode_state.last_partner_message)
        )
        breakdown['partner_engagement'] = min(0.20, sim * 0.25)
    else:
        breakdown['partner_engagement'] = 0.10

    # 3. PROGRESS TOWARD ROOT CAUSE (0.0-0.30)
    root_cause_desc = scenario.get('root_cause', {}).get('description', '')
    if root_cause_desc:
        root_cause_sim = cos_sim(
            get_embedding(message),
            get_embedding(root_cause_desc)
        )
        breakdown['progress'] = min(0.30, root_cause_sim * 0.40)
    else:
        breakdown['progress'] = 0.15

    # 4. TOOL USAGE (0.0-0.15)
    if tool_calls:
        new_tools = 0
        for t in tool_calls:
            sig = f"{t.tool_name}:{str(t.params)}"
            if sig not in episode_state.previous_tool_calls:
                new_tools += 1
        breakdown['tool_usage'] = min(0.15, new_tools * 0.08)
    else:
        breakdown['tool_usage'] = 0.0

    # 5. NOVELTY (0.0-0.10)
    if episode_state.all_messages:
        max_sim_to_history = max(
            cos_sim(get_embedding(message), get_embedding(prev))
            for prev in episode_state.all_messages[-4:]
        )
        breakdown['novelty'] = max(0.0, 0.10 * (1 - max_sim_to_history))
    else:
        breakdown['novelty'] = 0.10

    # PENALTIES
    penalty = 0.0
    if breakdown['novelty'] < 0.02:
        penalty += 0.15  # circular reasoning
        
    total = sum(breakdown.values()) - penalty
    final_score = round(max(0.0, min(1.0, total)), 4)
    
    # Store history
    episode_state.reward_history.append(final_score)
    episode_state.cumulative_reward += final_score
    
    return final_score, breakdown
