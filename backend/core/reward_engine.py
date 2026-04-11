from utils.embeddings import get_embedding, cos_sim
import logging

logger = logging.getLogger("nexus.reward_engine")

# Root-cause keywords per difficulty — pre-defined for fast matching
DIFFICULTY_ROOT_CAUSE_HINTS = {
    "easy":   ["rate_limit", "nginx", "rate limit", "429", "proxy", "throttle"],
    "medium": ["approval", "process", "workflow", "sla", "escalation", "manual"],
    "hard":   ["postgres", "connection pool", "long_running_query", "max_connections", "deadlock", "timeout"],
}

def compute_reward(message: str, tool_calls: list, tool_results: list, episode_state, scenario: dict) -> tuple[float, dict]:
    breakdown = {}
    msg_lower = message.lower()
    ep = episode_state
    sc = scenario
    difficulty = getattr(ep, "difficulty", "easy")

    # 1. HYPOTHESIS QUALITY — Reward specificity and domain alignment (0.0-0.20)
    #    Check if message mentions domain-specific terms relevant to this difficulty
    domain_hints = DIFFICULTY_ROOT_CAUSE_HINTS.get(difficulty, [])
    domain_hits = sum(1 for hint in domain_hints if hint in msg_lower)
    # General specificity — mentions numbers, config keys, service names
    generic_specificity = sum(0.01 for word in ["set to", "equals", "config", "found", "confirmed", "root cause",
                                                  "value", "log", "trace", "indicates", "returns"] if word in msg_lower)
    breakdown["hypothesis_quality"] = min(0.20, domain_hits * 0.04 + generic_specificity)

    # 2. TOOL USAGE QUALITY — Correct tools, no repeating same call (0.0-0.25)
    tool_score = 0.0
    if tool_calls:
        tool_categories = set()
        new_calls = 0
        for t in tool_calls:
            sig = f"{t.tool_name}:{str(t.params)}"
            if sig not in ep.previous_tool_calls:
                new_calls += 1
            if t.tool_name in ["read_logs", "check_config", "query_database", "check_service_status", "run_diagnostic"]:
                tool_categories.add("investigate")
            elif t.tool_name in ["update_config", "restart_service"]:
                tool_categories.add("fix")
            elif t.tool_name in ["propose_fix", "verify_fix", "submit_resolution"]:
                tool_categories.add("resolve")

        # Reward for covering investigation before jumping to fixes
        stage_coverage = len(tool_categories)
        tool_score = min(0.25, stage_coverage * 0.07 + new_calls * 0.04)

    breakdown["tool_usage"] = tool_score

    # 3. TOOL RESULT QUALITY — Did the tools find actionable info? (0.0-0.15)
    result_score = 0.0
    domain_found = False
    for tr in tool_results:
        result_text = tr.get("result", "").lower() if isinstance(tr, dict) else str(tr).lower()
        if any(kw in result_text for kw in ["error", "fail", "degraded", "anomaly", "threshold", "critical"]):
            result_score += 0.04  # Found a symptom
        if any(hint in result_text for hint in domain_hints):
            result_score += 0.05  # Found a domain-specific clue
            domain_found = True
        if "success" in result_text or "fixed" in result_text:
            result_score += 0.02  # Fix confirmed by tool
    breakdown["result_quality"] = min(0.15, result_score)

    # 4. CLUE ACCUMULATION — Discovering new clues (0.0-0.15)
    #    Cap at 3 clues to prevent reward hacking via tool spam
    if hasattr(ep, "clues_found") and ep.clues_found:
        breakdown["clue_discovery"] = min(0.15, len(ep.clues_found) * 0.04)
    else:
        breakdown["clue_discovery"] = 0.0

    # 5. INVESTIGATION STAGE PROGRESSION — Rewards forward momentum (0.0-0.15)
    stage_map = {
        "investigating": 0.03,
        "narrowing":     0.08,
        "hypothesizing": 0.12,
        "found":         0.15,
        "verified":      0.15,
    }
    breakdown["stage_progress"] = stage_map.get(getattr(ep, "investigation_stage", "investigating"), 0.03)

    # 6. SEMANTIC SIMILARITY TO ROOT CAUSE — Only if embeddings are available (0.0-0.15)
    #    More weight than before — this is the real quality signal
    similarity_score = 0.0
    try:
        root_cause_desc = sc.get("root_cause", {}).get("description", "")
        if root_cause_desc and message.strip():
            msg_emb = get_embedding(message)
            rc_emb = get_embedding(root_cause_desc)
            # Only reward if not using the zero-variance fallback embedding
            if len(msg_emb) == 384 and abs(sum(msg_emb)) > 0.001:
                sim = cos_sim(msg_emb, rc_emb)
                similarity_score = min(0.15, sim * 0.20)
    except Exception:
        pass
    breakdown["semantic_similarity"] = similarity_score

    # 7. NOVELTY — Penalize circular/repetitive reasoning (0.0-0.05)
    novelty_score = 0.05  # Start assuming novel
    try:
        if hasattr(ep, "all_messages") and len(ep.all_messages) > 1:
            msg_emb = get_embedding(message)
            max_sim = 0.0
            for prev in ep.all_messages[-3:]:
                prev_emb = get_embedding(prev)
                sim = cos_sim(msg_emb, prev_emb)
                if sim > max_sim:
                    max_sim = sim
            novelty_score = max(0.0, 0.05 * (1.0 - max_sim))
    except Exception:
        novelty_score = 0.03
    breakdown["novelty"] = novelty_score

    # ── PENALTIES ─────────────────────────────────────────────────────────────
    penalty = 0.0

    # Too terse: no useful reasoning
    if len(message.split()) < 8:
        penalty += 0.10

    # Too verbose without any tool calls: wall of text, no action
    if len(message) > 1200 and not tool_calls:
        penalty += 0.05

    # Circular reasoning: nearly identical to a recent message
    if breakdown["novelty"] < 0.005:
        penalty += 0.12

    # Wrong domain: confidently blaming the wrong service
    red_herrings = sc.get("red_herrings", [])
    if red_herrings:
        for rh in red_herrings:
            rh_lower = str(rh).lower()
            if rh_lower in msg_lower and "not" not in msg_lower:
                penalty += 0.05  # Fell for the red herring
                break

    # Invalid Tool Penalty
    for tr in tool_results:
        res_str = str(tr.get("result", "") if isinstance(tr, dict) else tr)
        if "Error: Tool" in res_str and "not found" in res_str:
            penalty += 0.10
        elif "Error executing tool" in res_str or "Critical Error" in res_str:
            # Add penalty for bad parameters
            penalty += 0.05

    # Tool Spamming Penalty (Calling the same tool repeatedly with no state change)
    if tool_calls:
        for t in tool_calls:
            sig = f"{t.tool_name}:{str(t.params)}"
            # If they called this exact same tool previously and it was an error or they just keep calling it
            if ep.previous_tool_calls.count(sig) > 2:
                penalty += 0.05

    # Unverified Proposal Penalty
    has_submit = any(t.tool_name == "submit_resolution" for t in tool_calls)
    if has_submit and not getattr(ep, "fix_verified", False):
        penalty += 0.15 # Attempting to end investigation without a proven fix

    total = sum(breakdown.values()) - penalty
    # Clamp to strictly between 0 and 1
    if total <= 0.0:
        final_score = 0.001
    elif total >= 1.0:
        final_score = 0.999
    else:
        final_score = round(total, 4)

    ep.reward_history.append(final_score)
    ep.cumulative_reward = round(ep.cumulative_reward + final_score, 4)

    return final_score, breakdown
