from .base_grader import BaseGrader

class MediumGrader(BaseGrader):
    def grade(self, episode_state, scenario: dict) -> float:
        score = 0.0
        criteria = scenario.get('grading_criteria', {})
        sys_state = getattr(episode_state, "system_state", {})
        
        # 1. State Mutation Checks for root cause
        inv_state = sys_state.get("inventory-service", {})
        
        threshold = inv_state.get("minimum_stock_threshold")
        if str(threshold) == "0":
            score += criteria.get("inventory_threshold_fixed", 0.45)
            
        if inv_state.get("status") == "running" and inv_state.get("last_reload") == "Just now":
            score += criteria.get("inventory_restarted", 0.10)

        # 2. Penalize red herrings tracking tool calls
        cdn_modified = False
        tool_calls = getattr(episode_state, "tool_calls_made", [])
        for call in tool_calls:
            if call["tool_name"] in ["update_config", "restart_service"]:
                if call["params"].get("service", "") == "cdn-edge-node":
                    cdn_modified = True
                    break
        
        if cdn_modified:
            score += criteria.get("penalty_cdn_edge_node_modified", -0.15)

        # 3. Episode boundaries
        if str(threshold) == "0" and not episode_state.fix_verified:
            score += criteria.get('fix_verified', 0.20) / 2

        if episode_state.fix_verified:
            score += criteria.get('fix_verified', 0.20)
            
        if episode_state.max_rounds > 0:
            steps_ratio = episode_state.steps_taken / episode_state.max_rounds
            if steps_ratio <= 0.6 and episode_state.fix_verified and str(threshold) == "0":
                score += criteria.get('efficiency_bonus', 0.10)

        return max(0.0, min(1.0, round(score, 4)))
