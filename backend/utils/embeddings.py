import httpx
from typing import List
from functools import lru_cache

@lru_cache(maxsize=256)
def get_embedding(text: str) -> List[float]:
    """Get embedding vector using Ollama directly (Synchronous)"""
    try:
        response = httpx.post("http://localhost:11434/api/embeddings", json={
            "model": "all-minilm",
            "prompt": text
        }, timeout=60.0)
        return response.json().get("embedding", [])
    except Exception as e:
        import logging
        logging.error(f"Embedding failed: {e}. Using pseudo-embedding fallback.")
        import re
        import hashlib
        words = re.findall(r'\w+', text.lower())
        vec = [0.0] * 384
        for w in words:
            idx = int(hashlib.md5(w.encode()).hexdigest(), 16) % 384
            vec[idx] += 1.0
        return vec

def cos_sim(a: List[float], b: List[float]) -> float:
    """Cosine similarity without PyTorch/Numpy dependencies"""
    if not a or not b: return 0.0
    dot_product = sum(x * y for x, y in zip(a, b))
    mag_a = sum(x * x for x in a) ** 0.5
    mag_b = sum(x * x for x in b) ** 0.5
    if mag_a == 0 or mag_b == 0: return 0.0
    return dot_product / (mag_a * mag_b)
