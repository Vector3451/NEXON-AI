from .base_grader import BaseGrader

class HardGrader(BaseGrader):
    def grade(self, episode_state, scenario: dict) -> float:
        score = 0.0
        criteria = scenario.get('grading_criteria', {})
        sys_state = getattr(episode_state, "system_state", {})
        
        # 1. State Mutation Checks for root cause
        pg_state = sys_state.get("postgres-db", {})
        
        # Determine if query was terminated (agent updated long_running_query to None/null string)
        q_val = str(pg_state.get("long_running_query")).lower()
        if q_val in ["none", "null", ""]:
            score += criteria.get("postgres_query_terminated", 0.25)
            
        max_conn = pg_state.get("max_connections", 20)
        try:
            if int(max_conn) >= 50:
                score += criteria.get("postgres_max_connections_increased", 0.20)
        except ValueError:
            pass
            
        timeout = pg_state.get("query_timeout_analytics")
        try:
            if timeout and int(timeout) > 0:
                score += criteria.get("postgres_query_timeout_set", 0.20)
        except ValueError:
            pass

        # 2. Penalize red herrings
        disk_modified = False
        tool_calls = getattr(episode_state, "tool_calls_made", [])
        for call in tool_calls:
            if call["tool_name"] in ["update_config", "restart_service"]:
                if call["params"].get("service", "") == "disk-backup-agent":
                    disk_modified = True
                    break
        
        if disk_modified:
            score += criteria.get("penalty_disk_backup_agent_modified", -0.15)

        # 3. Episode boundaries
        if episode_state.fix_verified and int(max_conn) >= 50:
            score += criteria.get('fix_verified', 0.10)
            
        if episode_state.max_rounds > 0:
            steps_ratio = episode_state.steps_taken / episode_state.max_rounds
            if steps_ratio <= 0.6 and episode_state.fix_verified and q_val in ["none", "null", ""]:
                score += criteria.get('efficiency_bonus', 0.05)

        return max(0.0, min(1.0, round(score, 4)))
