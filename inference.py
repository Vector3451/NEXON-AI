#!/usr/bin/env python3
"""
NEXUS Inference Script — OpenEnv Competition Submission
Must be placed at the root of the project repo.

Required environment variables (set in .env or passed externally):
  API_BASE_URL  - OpenAI-compatible endpoint. Examples:
                    HF Space:  https://api-inference.huggingface.co/v1
                    Local dev: http://localhost:11434/v1   (Ollama)
  MODEL_NAME    - Model identifier, e.g., "Qwen/Qwen2.5-3B-Instruct" (HF)
                  or "qwen2.5:3b" (Ollama)
  HF_TOKEN      - Your HuggingFace API key when using HF Inference endpoints.
                  For local Ollama usage set this to "ollama" or any string.

The OpenAI client transparently works with HF, Ollama, or any compatible API.

Output format (stdout only):
  [START] task=<task_name> env=nexus-incident-investigation model=<model>
  [STEP] step=<n> action="<text>" reward=<0.00> done=<true|false> error=null
  [END] success=<true|false> steps=<n> score=<0.000> rewards=<r1,r2,...>
"""

import os
import sys
import asyncio
import re
from pathlib import Path

# ── Resolve project root and load .env ────────────────────────────────────────
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv
load_dotenv(ROOT / "backend" / ".env")

# ── Required variables ─────────────────────────────────────────────────────────
MODEL_NAME   = os.environ.get("MODEL_NAME",   "meta-llama/Llama-3.1-8B-Instruct")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
HF_TOKEN     = os.environ.get("HF_TOKEN",     "")

# Priority: OpenAI API Key > HF Token > HF Inference (default)
if OPENAI_API_KEY:
    API_KEY = OPENAI_API_KEY
    API_BASE_URL = "https://api.openai.com/v1"
elif HF_TOKEN and HF_TOKEN not in ("", "ollama", "your_huggingface_token_here", "hf_YourTokenHere"):
    API_KEY = HF_TOKEN
    API_BASE_URL = "https://router.huggingface.co/v1"
else:
    API_KEY = ""
    API_BASE_URL = "https://router.huggingface.co/v1"

# ── OpenAI client (required by competition spec) ───────────────────────────────
from openai import OpenAI
client = OpenAI(base_url=API_BASE_URL, api_key=API_KEY)

# ── Backend imports ────────────────────────────────────────────────────────────
from backend.core.environment import NexusEnvironment
from backend.api.schemas.action import NexusAction, ToolCall

# ── Tool-call parser ───────────────────────────────────────────────────────────
def parse_tool_calls(text: str) -> list:
    tool_calls = []
    for match in re.finditer(r"TOOL:\s*([a-zA-Z0-9_]+)\(([^)]*)\)", text):
        name   = match.group(1)
        args_s = match.group(2)
        params = {}
        for kv in re.finditer(r"(\w+)=['\"]?([^,'\"]+)['\"]?", args_s):
            params[kv.group(1)] = kv.group(2)
        tool_calls.append(ToolCall(tool_name=name, params=params))
    return tool_calls

# ── Tasks definition (3 required by spec) ─────────────────────────────────────
TASKS = [
    {"name": "software-incident",        "difficulty": "easy"},
    {"name": "business-process-failure", "difficulty": "medium"},
    {"name": "cascade-system-failure",   "difficulty": "hard"},
]

SYSTEM_PROMPT = (
    "You are an expert incident investigator. Investigate the provided system incident.\n"
    "Use tools to gather evidence. Format tool calls EXACTLY as:\n"
    "  TOOL: tool_name(param='value')\n"
    "Available tools: read_logs, check_config, query_database, check_service_status, "
    "run_diagnostic, propose_fix, verify_fix\n"
    "Be concise. Produce a root-cause hypothesis and propose a fix."
)

MAX_STEPS = int(os.environ.get("MAX_STEPS", "8"))

# ── Main inference loop ────────────────────────────────────────────────────────
async def run():
    env = NexusEnvironment()

    for task in TASKS:
        _print(f"[START] task={task['name']} env=nexus-incident-investigation model={MODEL_NAME}")

        obs = await env.reset(task["name"], seed=42)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
        ]

        done     = False
        step_n   = 0
        rewards  = []

        while not done and step_n < MAX_STEPS:
            step_n += 1

            # Build user message from observation
            user_content = (
                f"Scenario: {obs.scenario_description}\n"
                f"Context: {obs.scenario_context}\n"
                f"Clues found so far: {obs.clues_found}\n"
                f"Round {obs.round}. Investigate and call tools."
            )
            if obs.tool_results:
                user_content += "\nLast tool results:\n" + "\n".join(
                    f"  {tr.tool_name}: {tr.result[:200]}" for tr in obs.tool_results
                )
            messages.append({"role": "user", "content": user_content})

            # ── LLM call (OpenAI client, required by spec) ─────────────────
            action_text = ""
            for attempt in range(3):
                try:
                    resp = client.chat.completions.create(
                        model=MODEL_NAME,
                        messages=messages,
                        max_tokens=300,
                        temperature=0.7
                    )
                    action_text = resp.choices[0].message.content or ""
                    break
                except Exception as e:
                    if attempt == 2:
                        _print(f"[STEP] step={step_n} error=\"{str(e)[:100]}\"")
                        raise
                    import time
                    time.sleep(2 ** attempt)

            messages.append({"role": "assistant", "content": action_text})

            # ── Parse tool calls & step environment ────────────────────────
            tool_calls = parse_tool_calls(action_text)
            action = NexusAction(
                agent_id="agent_a",
                message=action_text,
                tool_calls=tool_calls,
                confidence=0.8
            )
            obs, reward, done, info = await env.step(action)
            rewards.append(reward)

            # ── [STEP] log (exact format required) ────────────────────────
            clean   = action_text.replace("\n", " ")[:200]
            _print(
                f'[STEP] step={step_n} action="{clean}" '
                f'reward={reward:.2f} done={str(done).lower()} error=null'
            )

        # ── [END] log ──────────────────────────────────────────────────────
        final_score = info.get("final_score", rewards[-1] if rewards else 0.0)
        success     = info.get("success", final_score >= 0.5)
        rewards_str = ",".join(f"{r:.2f}" for r in rewards)
        _print(
            f"[END] success={str(success).lower()} steps={step_n} "
            f"score={final_score:.3f} rewards={rewards_str}"
        )

def _print(line: str):
    print(line, flush=True)

if __name__ == "__main__":
    asyncio.run(run())
