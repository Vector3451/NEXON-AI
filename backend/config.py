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

class Settings:
    # OLLAMA
    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "ollama")

    # AGENTS
    AGENT_A_MODEL = os.getenv("AGENT_A_MODEL", "")
    AGENT_B_MODEL = os.getenv("AGENT_B_MODEL", "")
    AGENT_A_PROVIDER = os.getenv("AGENT_A_PROVIDER", "ollama")
    AGENT_B_PROVIDER = os.getenv("AGENT_B_PROVIDER", "ollama")
    AGENT_A_ROLE = os.getenv("AGENT_A_ROLE", "INVESTIGATOR")
    AGENT_B_ROLE = os.getenv("AGENT_B_ROLE", "VALIDATOR")
    AGENT_A_SYSTEM_PROMPT = os.getenv("AGENT_A_SYSTEM_PROMPT", "")
    AGENT_B_SYSTEM_PROMPT = os.getenv("AGENT_B_SYSTEM_PROMPT", "")
    AGENT_A_TEMPERATURE = float(os.getenv("AGENT_A_TEMPERATURE", "0.8"))
    AGENT_B_TEMPERATURE = float(os.getenv("AGENT_B_TEMPERATURE", "0.6"))
    AGENT_A_MAX_TOKENS = int(os.getenv("AGENT_A_MAX_TOKENS", "300"))
    AGENT_B_MAX_TOKENS = int(os.getenv("AGENT_B_MAX_TOKENS", "300"))
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
