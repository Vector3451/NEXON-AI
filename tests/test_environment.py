import pytest
import asyncio
from core.environment import NexusEnvironment

@pytest.mark.asyncio
async def test_env_reset():
    env = NexusEnvironment()
    obs = await env.reset(task="software-incident")
    assert obs.scenario_description != ""
    assert "503" in str(obs.scenario_description).lower() or "rate limit" in str(obs.scenario_description).lower()
    assert env.active_episode is not None

@pytest.mark.asyncio
async def test_env_step():
    env = NexusEnvironment()
    await env.reset(task="software-incident")
    
    from api.schemas.action import NexusAction
    action = NexusAction(
        agent_id="agent_a",
        message="Checking Nginx logs",
        tool_calls=[],
        confidence=0.5
    )
    
    obs, reward, done, info = await env.step(action)
    assert reward >= 0.0
    assert not done
    assert env.active_episode.steps_taken == 1

@pytest.mark.asyncio
async def test_invalid_task():
    env = NexusEnvironment()
    with pytest.raises(ValueError):
        await env.reset(task="non-existent-task")
