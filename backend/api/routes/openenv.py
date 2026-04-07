from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from api.schemas.action import NexusAction
from api.schemas.observation import NexusObservation
from api.schemas.state import NexusState
from core.episode_manager import episode_manager
import asyncio
import psutil
from core.agent_runner import AgentRunner
from utils.logger import logger
from utils.hardware import check_hardware

router = APIRouter()
runner = AgentRunner()

async def simulation_loop():
    from api.routes.websocket import broadcast
    logger.info("Simulation loop started")
    if not episode_manager.env.active_episode:
        logger.error("No active episode for simulation")
        return
        
    step_num = 1
    done = False
    active_agent = "agent_a"
    
    while not done:
        # Check if the episode was reset/cancelled
        if not episode_manager.env.active_episode:
             break
        # Check for pause
        while episode_manager.is_paused:
            await asyncio.sleep(0.5)
            
        # Prevent loop if episode was closed elsewhere
        if not episode_manager.env.active_episode:
            logger.info("Episode ended or reset during simulation loop")
            break
            
        logger.info(f"Simulation Step {step_num}: Querying {active_agent}...")
        try:
            full_message = ""
            async for chunk in runner.run_step(active_agent, episode_manager.env.active_episode, episode_manager.env.active_scenario):
                full_message += chunk
                # Broadcast partial message to UI
                await broadcast("agent_partial", {
                    "agent_id": active_agent,
                    "chunk": chunk,
                    "full_message": full_message
                })
            
            logger.info(f"{active_agent} finished responding. Parsing tools...")
            tool_calls = runner.parse_tool_calls(full_message)
            
            action = NexusAction(
                agent_id=active_agent,
                message=full_message,
                tool_calls=tool_calls,
                confidence=0.8
            )
            obs, reward, done, info = await episode_manager.step(action)
            logger.info(f"Step {step_num} completed. Reward: {reward}. Done: {done}")
            
            if done:
                await broadcast("agent_partial", {
                    "agent_id": "system",
                    "chunk": "",
                    "full_message": f"\n\n[SYSTEM] EPISODE CONCLUDED. Final Validation Score: {info.get('final_score', 0)}\nSimulation halted."
                })
                break
        except Exception as e:
            logger.error(f"Error in simulation loop at step {step_num}: {e}")
            break
            
        active_agent = "agent_b" if active_agent == "agent_a" else "agent_a"
        step_num += 1
        await asyncio.sleep(1)
    
    logger.info("Simulation loop finished")
        
from typing import Optional, Dict, Any

class ResetRequest(BaseModel):
    task: str = "software-incident"
    custom_scenario: Optional[Dict[str, Any]] = None
    seed: Optional[int] = None
    max_steps: Optional[int] = None

class StepResponse(BaseModel):
    observation: NexusObservation
    reward: float
    done: bool
    info: dict

@router.post("/start-simulation")
async def start_simulation():
    if hasattr(episode_manager, 'simulation_task') and episode_manager.simulation_task and not episode_manager.simulation_task.done():
        return {"status": "already_running"}
    
    # Auto-reset if no episode exists
    if not episode_manager.env.active_episode:
        logger.info("No active episode found for simulation. Performing auto-reset.")
        await episode_manager.reset(task="software-incident")
        
    episode_manager.simulation_task = asyncio.create_task(simulation_loop())
    from api.routes.websocket import broadcast
    await broadcast("system_status", {"active": True, "paused": False})
    return {"status": "started"}

@router.post("/reset", response_model=NexusObservation)
async def reset_env(req: ResetRequest):
    try:
        obs = await episode_manager.reset(req.task, req.custom_scenario, seed=req.seed, max_steps=req.max_steps)
        return obs
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/step", response_model=StepResponse)
async def step_env(action: NexusAction):
    if not episode_manager.env.active_episode:
        raise HTTPException(status_code=400, detail="Environment not reset")
    try:
        obs, reward, done, info = await episode_manager.step(action)
        return StepResponse(
            observation=obs,
            reward=reward,
            done=done,
            info=info
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/state", response_model=NexusState)
def get_state():
    state = episode_manager.env.state()
    if not state:
        raise HTTPException(status_code=400, detail="No active episode")
    return state

@router.get("/telemetry")
def get_telemetry():
    hw = check_hardware()
    # Calling with interval=None returns percentage since last call
    return {
        "cpu": psutil.cpu_percent(interval=None),
        "ram": psutil.virtual_memory().percent,
        "gpu": hw["gpu_utilization"] if hw["use_gpu"] else 0,
        "vram": (hw["vram_used_gb"] / hw["vram_total_gb"] * 100) if hw["use_gpu"] and hw["vram_total_gb"] > 0 else 0
    }
