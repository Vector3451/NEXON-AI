import os
from typing import Tuple, Dict, List
from openai import AsyncOpenAI
import httpx

from config import settings
from .ollama_client import OllamaClient
from .hf_client import HFClient

class ModelManager:
    def __init__(self):
        self.ollama = OllamaClient(settings.OLLAMA_BASE_URL, settings.OLLAMA_API_KEY)
        self.hf_client = None
        
        hf_token = os.environ.get("HF_TOKEN", "") or settings.HF_TOKEN or ""
        if hf_token and hf_token not in ("", "your_huggingface_token_here", "ollama", "hf_YourTokenHere"):
            self.hf_client = HFClient(settings.HF_INFERENCE_URL, hf_token)
            
    def get_client(self, agent_id: str) -> Tuple[AsyncOpenAI, str]:
        if "API_BASE_URL" in os.environ and "API_KEY" in os.environ:
            client = AsyncOpenAI(
                base_url=os.environ["API_BASE_URL"],
                api_key=os.environ["API_KEY"]
            )
            model_name = os.environ.get("MODEL_NAME", "")
            if agent_id == "agent_a":
                model_name = model_name or settings.AGENT_A_MODEL
            else:
                model_name = model_name or settings.AGENT_B_MODEL
            return client, model_name

        hf_token = os.environ.get("HF_TOKEN", "") or settings.HF_TOKEN or ""
        openai_key = os.environ.get("OPENAI_API_KEY", "") or settings.OPENAI_API_KEY or ""

        if settings.CUSTOM_MODEL_ENABLED:
            if settings.CUSTOM_MODEL_AGENT.lower() in (agent_id.lower(), "both"):
                client = AsyncOpenAI(
                    base_url=settings.CUSTOM_MODEL_BASE_URL,
                    api_key=settings.CUSTOM_MODEL_API_KEY or "none"
                )
                return client, settings.CUSTOM_MODEL_NAME
                
        if agent_id == "agent_a":
            provider = settings.AGENT_A_PROVIDER
            model_name = os.environ.get("MODEL_NAME", "") or settings.AGENT_A_MODEL
        else:
            provider = settings.AGENT_B_PROVIDER
            model_name = os.environ.get("MODEL_NAME", "") or settings.AGENT_B_MODEL
        
        # Priority: OpenAI > HuggingFace > Ollama
        if provider == "openai" and openai_key:
            client = AsyncOpenAI(api_key=openai_key, base_url=settings.OPENAI_BASE_URL)
            return client, model_name
            
        if provider == "hf" or not self._is_ollama_available():
            if self.hf_client:
                return self.hf_client.get_client(), model_name
            if hf_token and hf_token not in ("", "your_huggingface_token_here", "ollama", "hf_YourTokenHere"):
                temp_client = HFClient(settings.HF_INFERENCE_URL, hf_token)
                return temp_client.get_client(), model_name
                
        if provider == "openrouter" and settings.OPENROUTER_API_KEY:
            client = AsyncOpenAI(api_key=settings.OPENROUTER_API_KEY, base_url=settings.OPENROUTER_BASE_URL)
            return client, model_name
        
        return self.ollama.get_client(), model_name
    
    def _is_ollama_available(self) -> bool:
        try:
            import socket
            host = settings.OLLAMA_BASE_URL.replace("http://", "").replace("https://", "").split(":")[0]
            port = 11434
            if ":" in settings.OLLAMA_BASE_URL:
                port = int(settings.OLLAMA_BASE_URL.split(":")[-1].split("/")[0])
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex((host, port))
            sock.close()
            return result == 0
        except:
            return False

    async def add_custom_model(self, agent_id: str, base_url: str, api_key: str, model_name: str) -> dict:
        try:
            client = AsyncOpenAI(base_url=base_url, api_key=api_key or "none")
            response = await client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": "Say 'hello' in exactly one word."}],
                max_tokens=10,
                timeout=30.0
            )
            
            if response and response.choices:
                env_map = {
                    "CUSTOM_MODEL_ENABLED": "true",
                    "CUSTOM_MODEL_BASE_URL": base_url,
                    "CUSTOM_MODEL_API_KEY": api_key,
                    "CUSTOM_MODEL_NAME": model_name,
                    "CUSTOM_MODEL_AGENT": agent_id
                }
                self._update_env_file(env_map)
                
                settings.CUSTOM_MODEL_ENABLED = True
                settings.CUSTOM_MODEL_BASE_URL = base_url
                settings.CUSTOM_MODEL_API_KEY = api_key
                settings.CUSTOM_MODEL_NAME = model_name
                settings.CUSTOM_MODEL_AGENT = agent_id
                
                return {"success": True, "message": "Custom model verified and activated."}
            else:
                return {"success": False, "message": "Model did not return a valid completion."}
                
        except Exception as e:
            return {"success": False, "message": f"Validation failed: {str(e)}"}

    async def remove_custom_model(self, agent_id: str):
        if settings.CUSTOM_MODEL_AGENT.lower() in (agent_id.lower(), "both"):
            env_map = {"CUSTOM_MODEL_ENABLED": "false"}
            self._update_env_file(env_map)
            settings.CUSTOM_MODEL_ENABLED = False

    async def list_available_models(self) -> List[str]:
        hf_token = os.environ.get("HF_TOKEN", "") or settings.HF_TOKEN or ""
        if hf_token and hf_token not in ("", "your_huggingface_token_here", "ollama", "hf_YourTokenHere"):
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        "https://huggingface.co/api/models",
                        headers={"Authorization": f"Bearer {hf_token}"},
                        timeout=30.0
                    )
                    if resp.status_code == 200:
                        models = resp.json()
                        return [m["id"] for m in models[:50]]
            except:
                pass
        return await self.ollama.list_models()

    def pull_model(self, model_name: str):
        return self.ollama.pull_model(model_name)
        
    def _update_env_file(self, overrides: dict):
        env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "default.env")
        if not os.path.exists(env_path):
            return
            
        with open(env_path, "r") as f:
            lines = f.readlines()
            
        new_lines = []
        for line in lines:
            updated = False
            for k, v in overrides.items():
                if line.startswith(f"{k}="):
                    new_lines.append(f"{k}={v}\n")
                    updated = True
                    break
            if not updated:
                new_lines.append(line)
                
        with open(env_path, "w") as f:
            f.writelines(new_lines)

model_manager = ModelManager()
