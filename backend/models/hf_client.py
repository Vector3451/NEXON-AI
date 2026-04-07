from openai import AsyncOpenAI

class HFClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.client = AsyncOpenAI(
            base_url=base_url,
            api_key=api_key
        )

    def get_client(self) -> AsyncOpenAI:
        return self.client
