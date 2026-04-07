from openai import AsyncOpenAI
import httpx
from typing import AsyncGenerator

class OllamaClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.client = AsyncOpenAI(
            base_url=base_url,
            api_key=api_key or "ollama"
        )
    
    def get_client(self) -> AsyncOpenAI:
        return self.client

    async def list_models(self) -> list:
        # Connect to ollama tags api
        url = self.base_url.replace("/v1", "/api/tags")
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, timeout=5.0)
                if response.status_code == 200:
                    data = response.json()
                    return [model["name"] for model in data.get("models", [])]
            except Exception:
                return []
        return []

    async def pull_model(self, model_name: str) -> AsyncGenerator[dict, None]:
        url = self.base_url.replace("/v1", "/api/pull")
        payload = {"name": model_name}
        
        async with httpx.AsyncClient() as client:
            async with client.stream("POST", url, json=payload) as response:
                async for line in response.aiter_lines():
                    if line:
                        yield line
