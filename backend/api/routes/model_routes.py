from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.model_manager import model_manager
from api.routes.websocket import broadcast
import httpx
import os

router = APIRouter()

class AddCustomModelReq(BaseModel):
    agent_id: str
    base_url: str
    api_key: str
    model_name: str

class RemoveCustomModelReq(BaseModel):
    agent_id: str

class PullModelReq(BaseModel):
    model_name: str

HF_MODELS = [
    "meta-llama/Llama-3.1-8B-Instruct",
    "meta-llama/Llama-3.2-1B-Instruct",
    "meta-llama/Llama-3.3-70B-Instruct",
    "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    "meta-llama/Llama-4-Maverick-17B-128E-Instruct",
    "meta-llama/Meta-Llama-3-8B-Instruct",
    "meta-llama/Meta-Llama-3-70B-Instruct",
    "google/gemma-4-31B-it",
    "google/gemma-4-26B-A4B-it",
    "google/gemma-3-27b-it",
    "google/gemma-3n-E4B-it",
    "Qwen/Qwen3.5-9B",
    "Qwen/Qwen2.5-7B-Instruct",
    "Qwen/Qwen2.5-72B-Instruct",
    "Qwen/Qwen2.5-Coder-7B-Instruct",
    "Qwen/Qwen2.5-Coder-32B-Instruct",
    "Qwen/Qwen3-8B",
    "Qwen/Qwen3-32B",
    "Qwen/Qwen3-4B-Instruct-2507",
    "Qwen/Qwen3-14B",
    "Qwen/Qwen3-VL-8B-Instruct",
    "Qwen/Qwen3-VL-30B-A3B-Instruct",
    "Qwen/QwQ-32B",
    "deepseek-ai/DeepSeek-R1",
    "deepseek-ai/DeepSeek-V3",
    "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",
    "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
    "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
    "deepseek-ai/DeepSeek-R1-Distill-Llama-70B",
    "deepseek-ai/DeepSeek-R1-Distill-Llama-8B",
    "deepseek-ai/DeepSeek-Prover-V2-671B",
    "CohereLabs/c4ai-command-r-08-2024",
    "CohereLabs/c4ai-command-r7b-arabic-02-2025",
    "CohereLabs/command-a-vision-07-2025",
    "CohereLabs/aya-expanse-32b",
    "CohereLabs/aya-vision-32b",
    "NousResearch/Hermes-2-Pro-Llama-3-8B",
    "MiniMaxAI/MiniMax-M2.5",
    "MiniMaxAI/MiniMax-M2",
    "MiniMaxAI/MiniMax-M1-80k",
    "moonshotai/Kimi-K2.5",
    "moonshotai/Kimi-K2-Instruct",
    "moonshotai/Kimi-K2-Thinking",
    "xiaomiMiMo/MiMo-V2-Flash",
    "zai-org/GLM-5",
    "zai-org/GLM-4.7-Flash",
    "zai-org/GLM-4.7",
    "zai-org/GLM-4.6",
    "zai-org/GLM-4.5",
]

@router.get("/models")
async def get_models():
    local_models = await model_manager.list_available_models()
    return {
        "local_models": local_models,
        "hf_models": HF_MODELS,
        "custom_model": {
            "enabled": True,
            "agent": "agent_a"
        }
    }

@router.get("/models/hf")
async def get_hf_models():
    hf_token = os.environ.get("HF_TOKEN", "") or "hf_demo"
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://router.huggingface.co/v1/models",
                headers={"Authorization": f"Bearer {hf_token}"},
                timeout=30.0
            )
            if resp.status_code == 200:
                data = resp.json()
                models = [m["id"] for m in data.get("data", [])]
                return {"models": models, "source": "hf_router"}
    except Exception as e:
        pass
    
    return {"models": HF_MODELS, "source": "fallback"}

@router.post("/models/add")
async def add_custom_model(req: AddCustomModelReq):
    result = await model_manager.add_custom_model(
        req.agent_id, req.base_url, req.api_key, req.model_name
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.delete("/models/remove")
async def remove_custom_model(req: RemoveCustomModelReq):
    await model_manager.remove_custom_model(req.agent_id)
    return {"success": True}

@router.post("/models/pull")
async def pull_model(req: PullModelReq):
    return {"message": "Streaming progress via WS not fully implemented but requested."}
