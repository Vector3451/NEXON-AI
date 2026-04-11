import json
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

# Load environment variables, checking both backend/ and project root
if (BASE_DIR / ".env").exists():
    load_dotenv(BASE_DIR / ".env")
elif (ROOT_DIR / ".env").exists():
    load_dotenv(ROOT_DIR / ".env")
elif (ROOT_DIR / "default.env").exists():
    load_dotenv(ROOT_DIR / "default.env")
else:
    load_dotenv() # Fallback to standard search

# Helper data for agent configuration
_BUILT_IN_ROLES = ["INVESTIGATOR", "VALIDATOR", "FORENSIC_ANALYST", "NETWORK_ENGINEER", "SYSTEM_ADMIN", "SECURITY_ARCHITECT", "COMPLIANCE_OFFICER"]
_DEFAULT_ROLES = ["INVESTIGATOR", "VALIDATOR", "FORENSIC_ANALYST", "NETWORK_ENGINEER"]

def _build_agents_from_env():
    import json
    agents = []
    suffix_map = {'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7, 'i': 8, 'j': 9}
    for suffix, idx in suffix_map.items():
        model_key = f"AGENT_{suffix.upper()}_MODEL"
        provider_key = f"AGENT_{suffix.upper()}_PROVIDER"
        role_key = f"AGENT_{suffix.upper()}_ROLE"
        prompt_key = f"AGENT_{suffix.upper()}_SYSTEM_PROMPT"
        temp_key = f"AGENT_{suffix.upper()}_TEMPERATURE"
        
        model = os.getenv(model_key, "")
        if model:
            role_idx = idx % len(_DEFAULT_ROLES)
            agents.append({
                "id": f"agent_{suffix}",
                "model": model,
                "provider": os.getenv(provider_key, "ollama"),
                "role": os.getenv(role_key, _DEFAULT_ROLES[role_idx]),
                "system_prompt": os.getenv(prompt_key, ""),
                "temperature": float(os.getenv(temp_key, str(0.7 - idx * 0.05)))
            })
    
    if not agents:
        agents = [
            {
                "id": "agent_a",
                "model": os.getenv("AGENT_A_MODEL", "meta-llama/Llama-3.1-8B-Instruct"),
                "provider": os.getenv("AGENT_A_PROVIDER", "hf"),
                "role": "INVESTIGATOR",
                "system_prompt": "",
                "temperature": 0.7
            },
            {
                "id": "agent_b",
                "model": os.getenv("AGENT_B_MODEL", "meta-llama/Llama-3.2-1B-Instruct"),
                "provider": os.getenv("AGENT_B_PROVIDER", "hf"),
                "role": "VALIDATOR",
                "system_prompt": "",
                "temperature": 0.6
            }
        ]
    return agents

class Settings:
    # OLLAMA
    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "ollama")

    # AGENTS (Dynamic N-Agent Support)
    try:
        AGENTS_JSON = os.getenv("AGENTS_JSON")
        AGENTS = json.loads(AGENTS_JSON) if AGENTS_JSON else _build_agents_from_env()
    except:
        AGENTS = _build_agents_from_env()
    # EXECUTION ENVIRONMENT
    EXECUTION_MODE = os.getenv("EXECUTION_MODE", "simulated")
    SSH_HOST = os.getenv("SSH_HOST", "")
    SSH_PORT = int(os.getenv("SSH_PORT", "22"))
    SSH_USER = os.getenv("SSH_USER", "")
    SSH_PASSWORD = os.getenv("SSH_PASSWORD", "")

    # HUGGINGFACE
    API_KEY = os.getenv("API_KEY", "ollama")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    HF_TOKEN = os.getenv("HF_TOKEN", "")
    HF_INFERENCE_URL = os.getenv("HF_INFERENCE_URL", "https://router.huggingface.co/v1")

    # OPENROUTER
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

    # SERVER
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "7860"))
    DEBUG = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")
    ENVIRONMENT = os.getenv("ENVIRONMENT", "local")

    # EPISODE
    MAX_STEPS = int(os.getenv("MAX_STEPS", "1000"))
    MAX_EPISODE_TIME_SECONDS = int(os.getenv("MAX_EPISODE_TIME_SECONDS", "1200"))
    SUCCESS_SCORE_THRESHOLD = float(os.getenv("SUCCESS_SCORE_THRESHOLD", "0.5"))

    # MCP TOOL SERVER
    MCP_SERVER_PORT = int(os.getenv("MCP_SERVER_PORT", "8001"))
    MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8001")

    # CUSTOM MODEL
    CUSTOM_MODEL_ENABLED = os.getenv("CUSTOM_MODEL_ENABLED", "false").lower() in ("true", "1", "yes")
    CUSTOM_MODEL_BASE_URL = os.getenv("CUSTOM_MODEL_BASE_URL", "")
    CUSTOM_MODEL_API_KEY = os.getenv("CUSTOM_MODEL_API_KEY", "")
    CUSTOM_MODEL_NAME = os.getenv("CUSTOM_MODEL_NAME", "")
    CUSTOM_MODEL_AGENT = os.getenv("CUSTOM_MODEL_AGENT", "")

settings = Settings()
