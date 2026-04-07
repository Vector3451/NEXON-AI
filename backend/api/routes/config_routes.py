from fastapi import APIRouter
from config import settings
from pydantic import BaseModel
from utils.hardware import check_hardware

router = APIRouter()

class ConfigUpdate(BaseModel):
    MAX_STEPS: int
    AGENT_A_MODEL: str
    AGENT_B_MODEL: str
    AGENT_A_PROVIDER: str
    AGENT_B_PROVIDER: str
    AGENT_A_ROLE: str = "INVESTIGATOR"
    AGENT_B_ROLE: str = "VALIDATOR"
    AGENT_A_SYSTEM_PROMPT: str = ""
    AGENT_B_SYSTEM_PROMPT: str = ""
    AGENT_A_TEMPERATURE: float
    AGENT_B_TEMPERATURE: float
    EXECUTION_MODE: str = "simulated"
    SSH_HOST: str = ""
    SSH_PORT: int = 22
    SSH_USER: str = ""
    SSH_USER: str = ""
    SSH_PASSWORD: str = ""
    OPENAI_API_KEY: str = ""

@router.get("/config")
def get_config():
    hw = check_hardware()
    return {
        "models": {
            "agent_a": settings.AGENT_A_MODEL,
            "agent_b": settings.AGENT_B_MODEL,
            "agent_a_provider": settings.AGENT_A_PROVIDER,
            "agent_b_provider": settings.AGENT_B_PROVIDER,
            "agent_a_role": settings.AGENT_A_ROLE,
            "agent_b_role": settings.AGENT_B_ROLE,
            "agent_a_system_prompt": settings.AGENT_A_SYSTEM_PROMPT,
            "agent_b_system_prompt": settings.AGENT_B_SYSTEM_PROMPT,
            "agent_a_temp": settings.AGENT_A_TEMPERATURE,
            "agent_b_temp": settings.AGENT_B_TEMPERATURE,
            "openai_api_key": settings.OPENAI_API_KEY
        },
        "episode": {
            "max_steps": settings.MAX_STEPS,
            "max_time": settings.MAX_EPISODE_TIME_SECONDS
        },
        "execution": {
            "mode": settings.EXECUTION_MODE,
            "ssh_host": settings.SSH_HOST,
            "ssh_port": settings.SSH_PORT,
            "ssh_user": settings.SSH_USER,
            "ssh_password": settings.SSH_PASSWORD
        },
        "hardware": hw
    }

@router.post("/config")
def update_config(req: ConfigUpdate):
    settings.MAX_STEPS = req.MAX_STEPS
    settings.AGENT_A_MODEL = req.AGENT_A_MODEL
    settings.AGENT_B_MODEL = req.AGENT_B_MODEL
    settings.AGENT_A_PROVIDER = req.AGENT_A_PROVIDER
    settings.AGENT_B_PROVIDER = req.AGENT_B_PROVIDER
    settings.AGENT_A_ROLE = req.AGENT_A_ROLE
    settings.AGENT_B_ROLE = req.AGENT_B_ROLE
    settings.AGENT_A_SYSTEM_PROMPT = req.AGENT_A_SYSTEM_PROMPT
    settings.AGENT_B_SYSTEM_PROMPT = req.AGENT_B_SYSTEM_PROMPT
    settings.AGENT_A_TEMPERATURE = req.AGENT_A_TEMPERATURE
    settings.AGENT_B_TEMPERATURE = req.AGENT_B_TEMPERATURE
    settings.EXECUTION_MODE = req.EXECUTION_MODE
    settings.SSH_HOST = req.SSH_HOST
    settings.SSH_PORT = req.SSH_PORT
    settings.SSH_USER = req.SSH_USER
    settings.SSH_PASSWORD = req.SSH_PASSWORD
    settings.OPENAI_API_KEY = req.OPENAI_API_KEY
    
    # Persist to default.env
    from models.model_manager import model_manager
    model_manager._update_env_file({
        "MAX_STEPS": req.MAX_STEPS,
        "AGENT_A_MODEL": req.AGENT_A_MODEL,
        "AGENT_B_MODEL": req.AGENT_B_MODEL,
        "AGENT_A_PROVIDER": req.AGENT_A_PROVIDER,
        "AGENT_B_PROVIDER": req.AGENT_B_PROVIDER,
        "AGENT_A_ROLE": req.AGENT_A_ROLE,
        "AGENT_B_ROLE": req.AGENT_B_ROLE,
        "AGENT_A_SYSTEM_PROMPT": req.AGENT_A_SYSTEM_PROMPT,
        "AGENT_B_SYSTEM_PROMPT": req.AGENT_B_SYSTEM_PROMPT,
        "AGENT_A_TEMPERATURE": req.AGENT_A_TEMPERATURE,
        "AGENT_B_TEMPERATURE": req.AGENT_B_TEMPERATURE,
        "EXECUTION_MODE": req.EXECUTION_MODE,
        "SSH_HOST": req.SSH_HOST,
        "SSH_PORT": req.SSH_PORT,
        "SSH_USER": req.SSH_USER,
        "SSH_PASSWORD": req.SSH_PASSWORD,
        "OPENAI_API_KEY": req.OPENAI_API_KEY
    })
    
    return {"status": "success", "message": "Config updated for next episode"}

@router.post("/pause")
def pause():
    from core.episode_manager import episode_manager
    episode_manager.is_paused = not episode_manager.is_paused
    return {"paused": episode_manager.is_paused}

@router.post("/config/ssh-test")
def test_ssh_connection():
    """Test the currently configured SSH credentials without saving."""
    from utils.ssh_client import execute_ssh_command
    result = execute_ssh_command("echo nexus_ping_ok")
    success = result["exit_code"] == 0 and "nexus_ping_ok" in result["stdout"]
    return {
        "success": success,
        "error": result["stderr"] if not success else None
    }
