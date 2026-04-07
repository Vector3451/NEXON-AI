from .base_grader import BaseGrader

class EasyGrader(BaseGrader):
    def grade(self, episode_state, scenario: dict) -> float:
        score = 0.0
        criteria = scenario.get('grading_criteria', {})
        sys_state = getattr(episode_state, "system_state", {})
        
        # 1. State Mutation Checks (Un-exploitable)
        nginx_state = sys_state.get("nginx-proxy", {})
        
        rate_limit = str(nginx_state.get("rate_limit", ""))
        # Check if rate_limit was set to 1000 (allowing for various common formats)
        if rate_limit in ["1000", "1000.0", "1k"]:
            score += criteria.get("nginx_rate_limit_fixed", 0.50)
            
        status = str(nginx_state.get("status", "")).lower()
        last_reload = str(nginx_state.get("last_reload", ""))
        if status == "running" and (last_reload == "Just now" or "second" in last_reload.lower()):
            score += criteria.get("nginx_restarted", 0.20)

        # 2. Episode boundaries
        if episode_state.fix_verified:
            score += criteria.get('fix_verified', 0.20)
            
        if episode_state.max_rounds > 0:
            steps_ratio = episode_state.steps_taken / episode_state.max_rounds
            if steps_ratio <= 0.6 and episode_state.fix_verified and str(rate_limit) == "1000":
                score += criteria.get('efficiency_bonus', 0.10)

        return max(0.0, min(1.0, round(score, 4)))
