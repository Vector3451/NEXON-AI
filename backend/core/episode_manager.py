import asyncio
from core.environment import NexusEnvironment
from api.routes.websocket import broadcast

class EpisodeManager:
    """Manages active episodes and coordinates the WebSocket emissions."""
    def __init__(self):
        self.env = NexusEnvironment()
        self.is_paused = False
        self.simulation_task = None

    async def reset(self, task: str, custom_scenario: dict = None, seed: int = None, max_steps: int = None):
        # Cancel any active simulation loop
        if hasattr(self, 'simulation_task') and self.simulation_task and not self.simulation_task.done():
            self.simulation_task.cancel()
            try:
                await self.simulation_task
            except asyncio.CancelledError:
                pass
            self.simulation_task = None

        obs = await self.env.reset(task=task, custom_scenario=custom_scenario, seed=seed, max_steps=max_steps)
        
        # Broadcast episode_start
        sc_safe = self.env.active_scenario.copy()
        if "root_cause" in sc_safe: del sc_safe["root_cause"]
        if "correct_fix" in sc_safe: del sc_safe["correct_fix"]
        if "clue_map" in sc_safe: del sc_safe["clue_map"]
        
        from config import settings
        await broadcast("episode_start", {
            "episode_id": self.env.active_episode.episode_id,
            "scenario": sc_safe,
            "task": task,
            "difficulty": self.env.active_episode.difficulty,
            "agent_a_model": settings.AGENT_A_MODEL,
            "agent_b_model": settings.AGENT_B_MODEL
        })
        return obs

    async def step(self, action):
        obs, reward, done, info = await self.env.step(action)
        
        # Broadcast agent message
        await broadcast("agent_message", {
            "agent_id": action.agent_id,
            "message": action.message,
            "step": self.env.active_episode.steps_taken
        })
        
        # Broadcast tool calls
        for tc in action.tool_calls:
            await broadcast("tool_call", {
                "agent_id": action.agent_id,
                "tool_name": tc.tool_name,
                "params": tc.params,
                "step": self.env.active_episode.steps_taken
            })
            
        # Broadcast tool results
        for tr in obs.tool_results:
            await broadcast("tool_result", {
                "tool_name": tr.tool_name,
                "result": tr.result,
                "success": tr.success,
                "step": self.env.active_episode.steps_taken
            })
            
        # Broadcast reward
        await broadcast("reward_update", {
            "agent_id": action.agent_id,
            "reward": reward,
            "breakdown": info.get("breakdown", {}),
            "cumulative": self.env.active_episode.cumulative_reward,
            "step": self.env.active_episode.steps_taken
        })

        if done:
            await broadcast("episode_end", {
                "episode_id": self.env.active_episode.episode_id,
                "success": info.get("success", False),
                "steps_taken": self.env.active_episode.steps_taken,
                "final_score": info.get("final_score", getattr(self.env.active_episode, "cumulative_reward", 0)),
                "final_breakdown": info.get("breakdown", {}),
                "clues_found": self.env.active_episode.clues_found,
                "root_cause_found": self.env.active_episode.fix_correct,
                "fix_verified": self.env.active_episode.fix_verified,
                "time_taken_seconds": 0,
                "reward_history": self.env.active_episode.reward_history
            })

        return obs, reward, done, info

episode_manager = EpisodeManager()
