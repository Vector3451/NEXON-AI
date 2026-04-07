from pydantic import BaseModel

class CustomModelConfig(BaseModel):
    base_url: str
    api_key: str
    model_name: str
    agent_id: str
