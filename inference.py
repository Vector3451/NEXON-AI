#!/usr/bin/env python3
"""
NEXUS Inference Script — OpenEnv Competition Submission
"""

import os
import sys
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

# ── Environment Variables (spec-required) ──────────────────────────────────────
API_BASE_URL = os.getenv("API_BASE_URL", "https://router.huggingface.co/v1")
MODEL_NAME   = os.getenv("MODEL_NAME",   "meta-llama/Llama-3.1-8B-Instruct")
HF_TOKEN     = os.getenv("HF_TOKEN")

if HF_TOKEN is None:
    raise ValueError("HF_TOKEN environment variable is required")

API_KEY = os.getenv("API_KEY", HF_TOKEN)

# Import AFTER path setup
from openai import OpenAI  # sync client — matches spec example exactly
from backend.core.environment import NexusEnvironment
from backend.api.schemas.action import NexusAction, ToolCall

# ── Config ─────────────────────────────────────────────────────────────────────
MAX_STEPS = int(os.environ.get("MAX_STEPS", "8"))

TASKS = [
    {"name": "software-incident",         "difficulty": "easy"},
    {"name": "business-process-failure",  "difficulty": "medium"},
    {"name": "cascade-system-failure",    "difficulty": "hard"},
]

SYSTEM_PROMPT = (
    "You are an expert incident investigator. "
    "Your goal is to identify the root cause of system incidents and apply the correct fix. "
    "You have access to these tools — call them by writing: TOOL: tool_name(param='value')\n"
    "Available tools: read_logs, check_config, query_database, check_service_status, "
    "update_config, restart_service, propose_fix, verify_fix, submit_resolution\n\n"
    "Strategy:\n"
    "1. Use read_logs and check_service_status to gather evidence.\n"
    "2. Use update_config or restart_service to apply your fix.\n"
    "3. Use verify_fix to confirm the fix worked.\n"
    "4. Call submit_resolution with root_cause_service, root_cause_description, and fix_applied.\n"
    "After each tool result, update your hypothesis. The system state shown to you reflects real changes."
)

# ── Helpers ────────────────────────────────────────────────────────────────────
def _print(line: str):
    print(line, flush=True)

def _safe_action(text: str) -> str:
    """Strip newlines and truncate for the [STEP] action field — NO quotes."""
    return text.replace("\n", " ").replace("\r", "").strip()[:300]

def _safe_error(error: str) -> str:
    """Format error for [STEP] — raw string, no quotes, or null."""
    if not error:
        return "null"
    return error.replace("\n", " ").strip()[:200]

def parse_tool_calls(text: str) -> list[ToolCall]:
    tool_calls = []
    for match in re.finditer(r"TOOL:\s*([a-zA-Z0-9_]+)\(([^)]*)\)", text):
        name = match.group(1)
        args_s = match.group(2)
        params = {}
        for kv in re.finditer(r"(\w+)=['\"]?([^,'\"]+)['\"]?", args_s):
            params[kv.group(1)] = kv.group(2).strip()
        tool_calls.append(ToolCall(tool_name=name, params=params))
    return tool_calls

def build_user_content(obs) -> str:
    """Build the user message from the current observation, including system state."""
    parts = [
        f"Scenario: {obs.scenario_description}",
        f"Context: {obs.scenario_context}",
        f"Round: {obs.round}",
    ]

    # Show the agent what the system state currently looks like
    if hasattr(obs, "system_state") and obs.system_state:
        parts.append(f"Current system state: {obs.system_state}")

    # Show tool results from last step
    if hasattr(obs, "tool_results") and obs.tool_results:
        results_str = "; ".join(
            f"{tr.tool_name}: {tr.result}" for tr in obs.tool_results
        )
        parts.append(f"Tool results: {results_str}")

    # Show clues found so far
    if hasattr(obs, "clues_found") and obs.clues_found:
        parts.append(f"Clues found: {', '.join(obs.clues_found[-5:])}")

    parts.append("Investigate and call tools to find and fix the root cause.")
    return "\n".join(parts)

# ── Main Inference Loop ────────────────────────────────────────────────────────
def run():
    import asyncio

    client = OpenAI(base_url=API_BASE_URL, api_key=API_KEY)
    env = NexusEnvironment()

    for task in TASKS:
        _print(f"[START] task={task['name']} env=nexus-incident-investigation model={MODEL_NAME}")

        # Reset environment
        try:
            obs = asyncio.run(env.reset(task=task["name"], seed=42))
        except Exception as e:
            err = _safe_error(f"reset failed: {str(e)}")
            _print(f"[STEP] step=1 action=reset_attempted reward=0.01 done=true error={err}")
            _print("[END] success=false steps=1 rewards=0.01")
            continue

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        done = False
        step_n = 0
        rewards = []
        last_error = "null"

        while not done and step_n < MAX_STEPS:
            step_n += 1

            # Build user message from observation (including system state feedback)
            user_content = build_user_content(obs)
            messages.append({"role": "user", "content": user_content})

            # Call LLM
            action_text = ""
            last_error = "null"
            try:
                resp = client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=messages,
                    max_tokens=400,
                    temperature=0.5,
                    timeout=120.0
                )
                action_text = resp.choices[0].message.content or ""
            except Exception as e:
                last_error = _safe_error(str(e))
                rewards_str = ",".join(f"{r:.2f}" for r in rewards) if rewards else "0.01"
                _print(f"[STEP] step={step_n} action=llm_call_failed reward=0.01 done=true error={last_error}")
                _print(f"[END] success=false steps={step_n} rewards={rewards_str}")
                break

            messages.append({"role": "assistant", "content": action_text})

            # Parse tool calls from LLM response
            tool_calls = parse_tool_calls(action_text)
            action = NexusAction(
                agent_id="agent_a",
                message=action_text,
                tool_calls=tool_calls,
                confidence=0.8
            )

            # Step the environment
            try:
                obs, reward, done, info = asyncio.run(env.step(action))
            except Exception as e:
                last_error = _safe_error(str(e))
                rewards_str = ",".join(f"{r:.2f}" for r in rewards) if rewards else "0.01"
                _print(f"[STEP] step={step_n} action={_safe_action(action_text)} reward=0.01 done=true error={last_error}")
                _print(f"[END] success=false steps={step_n} rewards={rewards_str}")
                break

            # Clamp reward to be strictly between 0 and 1
            clamped_reward = max(0.001, min(0.999, reward))
            rewards.append(clamped_reward)

            # Emit [STEP] — NO quotes around action or error values
            action_str = _safe_action(action_text)
            _print(
                f"[STEP] step={step_n} action={action_str} "
                f"reward={clamped_reward:.2f} done={str(done).lower()} error={last_error}"
            )
        else:
            # Normal loop completion — emit [END]
            final_score = info.get("final_score", rewards[-1] if rewards else 0.01) if rewards else 0.01
            # Ensure final_score is strictly between 0 and 1
            final_score = max(0.001, min(0.999, final_score))
            success = final_score >= 0.5
            rewards_str = ",".join(f"{r:.2f}" for r in rewards) if rewards else "0.01"
            _print(f"[END] success={str(success).lower()} steps={step_n} rewards={rewards_str}")

    # Always close
    try:
        asyncio.run(env.close())
    except Exception:
        pass


if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        # Even on fatal error, emit a valid [END] if possible
        print(f"[END] success=false steps=0 rewards=0.01", flush=True)
        sys.exit(1)
