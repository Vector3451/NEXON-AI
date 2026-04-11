import json
from typing import Tuple, Dict

from scenarios.scenario_loader import scenario_loader
from core.state_manager import EpisodeState
from core.reward_engine import compute_reward
from core.agent_runner import AgentRunner
from scenarios.graders.easy_grader import EasyGrader
from scenarios.graders.medium_grader import MediumGrader
from scenarios.graders.hard_grader import HardGrader
from api.schemas.action import NexusAction
from api.schemas.observation import NexusObservation, ToolResult
from config import settings
import statistics

SIMULATED_TOOLS = ["read_logs", "check_config", "query_database", "check_service_status", "run_diagnostic", "update_config", "restart_service", "propose_fix", "verify_fix", "submit_resolution"]
SSH_TOOLS = ["run_terminal_command", "propose_fix", "verify_fix", "submit_resolution"]

class NexusEnvironment:
    def __init__(self):
        self.runner = AgentRunner()
        self.active_episode = None
        self.active_scenario = None
        
        self.graders = {
            "easy": EasyGrader(),
            "medium": MediumGrader(),
            "hard": HardGrader()
        }

    async def reset(self, task: str = "software-incident", scenario_id: str = None, custom_scenario: dict = None, seed: int = None, max_steps: int = None) -> NexusObservation:
        # Determine difficulty from task
        valid_tasks = ["software-incident", "business-process-failure", "cascade-system-failure"]
        if task not in valid_tasks and not custom_scenario and not scenario_id:
            raise ValueError(f"Invalid task name: {task}")
            
        difficulty = "easy"
        if task == "business-process-failure":
            difficulty = "medium"
        elif task == "cascade-system-failure":
            difficulty = "hard"
            
        if custom_scenario:
            scenario = custom_scenario
            scenario["id"] = scenario.get("id", "custom-1")
            scenario["description"] = scenario.get("description", "Custom imported scenario.")
            scenario["context"] = scenario.get("context", "Custom uploaded environment.")
            if "difficulty" in scenario:
                 difficulty = scenario["difficulty"].lower()
        elif scenario_id:
            scenario = scenario_loader.get_scenario(scenario_id)
        else:
            scenarios = scenario_loader.get_scenarios_by_difficulty(difficulty)
            if not scenarios:
                raise ValueError(f"No scenarios found for difficulty {difficulty}")
            import random
            if seed is not None:
                random.seed(seed)
            scenario = random.choice(scenarios)
            
        self.active_scenario = scenario
        self.active_episode = EpisodeState(
            scenario_id=scenario["id"],
            task=task,
            difficulty=difficulty,
            max_rounds=max_steps if max_steps is not None else settings.MAX_STEPS,
            scenario_data=scenario
        )
        
        available_tools = SSH_TOOLS if settings.EXECUTION_MODE == "ssh" else SIMULATED_TOOLS
        obs = NexusObservation(
            partner_message="",
            tool_results=[],
            system_state=self.active_episode.system_state,  # Expose real state so agent sees initial conditions
            investigation_stage="investigating",
            round=1,
            available_tools=available_tools,
            clues_found=[],
            scenario_description=scenario["description"],
            scenario_context=scenario["context"]
        )
        return obs
        
    async def step(self, action: NexusAction) -> Tuple[NexusObservation, float, bool, dict]:
        if not self.active_episode:
            raise ValueError("Environment must be reset before calling step")
            
        ep = self.active_episode
        sc = self.active_scenario
        
        # 1. Add agent message to state
        ep.add_message(action.agent_id, action.message)
        
        # 2. Execute tools
        tool_results_data = await self.runner.execute_tool_calls(action.tool_calls, sc, ep.current_round, ep)
        
        # Process tool clues
        tool_results_objs = []
        for tr in tool_results_data:
            if "status: degraded" in tr['result'].lower() or "error" in tr['result'].lower() or "anomaly" in tr['result'].lower() or "warning" in tr['result'].lower() or tr['tool_name'] == 'propose_fix' or tr['tool_name'] == 'verify_fix':
                ep.add_clue(tr['result'])
            tool_results_objs.append(ToolResult(**tr))
            
        # 3. Compute semantic reward dynamically
        reward, breakdown = compute_reward(action.message, action.tool_calls, tool_results_data, ep, sc)
        
        # Stop when resolution submitted or max steps taken
        if ep.fix_verified or ep.steps_taken >= ep.max_rounds:
            ep.done = True
            
            # If they maxed out without resolving, inject a synthetic report so the UI doesn't look broken
            if not ep.fix_verified:
                ep.add_tool_call("submit_resolution", {
                    "root_cause_service": "UNRESOLVED",
                    "root_cause_description": "Investigation terminated: Maximum round limit reached without agent consensus.",
                    "fix_applied": "No fix was submitted."
                })
            
            # Hybrid Final Scorer: Combine objective grader results with semantic reward history
            grader = self.graders.get(ep.difficulty, self.graders["easy"])
            grader_score = grader.grade(ep, sc)
            
            # Use average step reward as the semantic component (0.0 - 1.0)
            avg_semantic = statistics.mean(ep.reward_history) if ep.reward_history else 0.0
            
            # Weighted average: Grader (Objective) 60% + Semantic (Quality) 40%
            # If the grader score is 0.9 or higher, we lean more into the objective truth.
            if grader_score >= 0.90:
                final_score = grader_score * 0.8 + avg_semantic * 0.2
            else:
                final_score = grader_score * 0.6 + avg_semantic * 0.4
            
            # Clamp to strictly between 0 and 1
            if final_score <= 0.0:
                final_score = 0.001
            elif final_score >= 1.0:
                final_score = 0.999
            else:
                final_score = round(final_score, 4)
            
            info = {
                "breakdown": {**breakdown, "semantic_avg": round(avg_semantic, 4), "objective_score": grader_score},
                "final_score": final_score,
                "success": (final_score >= settings.SUCCESS_SCORE_THRESHOLD) or (ep.fix_verified and grader_score > 0)
            }
        else:
            info = {"breakdown": breakdown}

        obs = NexusObservation(
            partner_message=action.message,
            tool_results=tool_results_objs,
            system_state=ep.system_state,  # Return real mutated state so agent sees the effect of its actions
            investigation_stage=ep.investigation_stage,
            round=ep.current_round,
            available_tools=SSH_TOOLS if settings.EXECUTION_MODE == "ssh" else SIMULATED_TOOLS,
            clues_found=ep.clues_found,
            scenario_description=sc["description"],
            scenario_context=sc["context"]
        )
        
        return obs, reward, ep.done, info

    def state(self):
        if not self.active_episode:
            # Return a valid default state so the /state endpoint always responds
            return {"status": "idle", "message": "No active episode. Call /reset to start."}
        return self.active_episode.to_pydantic()

    async def close(self):
        """Clean up the active episode. Required by OpenEnv spec."""
        self.active_episode = None
        self.active_scenario = None
