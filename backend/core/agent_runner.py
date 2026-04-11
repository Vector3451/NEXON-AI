import re
import asyncio
from typing import List
from api.schemas.action import ToolCall
from models.model_manager import model_manager
from tools.tool_registry import registry
from utils.logger import logger
from config import settings

ROLE_DEFINITIONS = {
    "INVESTIGATOR": "You are an expert incident investigator with deep systems knowledge. Your job: form specific hypotheses, test them with tools, eliminate dead ends, and find the root cause. Be direct. Be technical. Never be vague.",
    "VALIDATOR": "You are an expert systems validator and devil's advocate. Your job: challenge every hypothesis with evidence, find edge cases, and verify fixes. Do NOT simply agree. If your partner is wrong, prove it with tools. If they found the root cause, verify it thoroughly before accepting.",
    "FORENSIC_ANALYST": "You are an elite digital forensic analyst. Focus heavily on reading logs, inspecting file timestamps, memory dumps, and tracing bash histories. Do not guess—look for precise digital fingerprints and anomalies deep in the system logs.",
    "NETWORK_ENGINEER": "You are a senior network engineer. Focus exclusively on port communication, routing tables, ping, active TCP/UDP connections, and firewall configurations. Your instinct is to determine how the threat or failure is propagating across the internal mesh.",
    "SYSTEM_ADMIN": "You are a grizzled system administrator. Focus on core OS services, user permissions, kernel messages (dmesg), cron jobs, and runaway processes. Fix operational misconfigurations logically and decisively.",
    "SECURITY_ARCHITECT": "You are a rigorous security architect. You look for structural flaws: overly permissive firewall rules, unencrypted traffic flows, and exposed secrets. Treat every incident as a potential systemic breach.",
    "COMPLIANCE_OFFICER": "You are a strict compliance and audit officer. You focus strictly on policy violations and unauthorized data access. Identify unapproved tools and non-compliant execution paths. Prioritize strict adherence over operational speed."
}

TOOL_INSTRUCTIONS_SIMULATED = """
You have access to simulation tools. When calling a tool write exactly: TOOL: tool_name(param="value")
You can call multiple tools per message. You must use tools like update_config and restart_service to fix the system. 
Once the fix is verified entirely, call TOOL: submit_resolution(root_cause_service="...", root_cause_description="...", fix_applied="...") to end the investigation.
"""

TOOL_INSTRUCTIONS_SSH = """
You are operating on a LIVE remote Linux server. You have a real bash terminal via the run_terminal_command tool. USE IT AGGRESSIVELY.
You have root access. Do NOT theorize without evidence — run actual commands to get facts.
When calling a tool write exactly: TOOL: run_terminal_command(command="your bash command here")
Examples: TOOL: run_terminal_command(command="journalctl -n 50 --no-pager")
          TOOL: run_terminal_command(command="systemctl status nginx")
You can also call propose_fix. Once the fix is verified, call TOOL: submit_resolution(root_cause_service="...", root_cause_description="...", fix_applied="...") to end the investigation.
"""

class AgentRunner:
    def parse_tool_calls(self, message: str) -> List[ToolCall]:
        # Parse "TOOL: tool_name(param="value")"
        tool_calls = []
        pattern = r'TOOL:\s*([a-zA-Z0-9_]+)\((.*?)\)'
        matches = re.finditer(pattern, message)
        
        for match in matches:
            tool_name = match.group(1)
            params_str = match.group(2)
            
            # Simple param parsing - expects key="value", key='value' or key=value
            params = {}
            if params_str.strip():
                param_pairs = params_str.split(',')
                for pair in param_pairs:
                    if '=' in pair:
                        k, v = pair.split('=', 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        params[k] = v
            
            tool_calls.append(ToolCall(tool_name=tool_name, params=params))
            
        return tool_calls

    async def execute_tool_calls(self, tool_calls: List[ToolCall], scenario: dict, round_num: int, episode_state) -> List[dict]:
        results = []
        for tc in tool_calls:
            # We call the registry. In reality, MCP might be external but here it's in-process registry calls
            # Episode state is passed for propose_fix and verify_fix
            res_str = registry.call_tool(tc.tool_name, tc.params, scenario, round_num, episode_state)
            
            # Record it in state
            episode_state.add_tool_call(tc.tool_name, tc.params)
            
            results.append({
                "tool_name": tc.tool_name,
                "result": res_str,
                "success": not res_str.startswith("Error")
            })
        return results

    async def run_step(self, agent_id: str, episode_state, scenario: dict, max_retries: int = 2):
        client, model_name = model_manager.get_client(agent_id)
        
        is_ssh = settings.EXECUTION_MODE == "ssh"
        tool_rules = TOOL_INSTRUCTIONS_SSH if is_ssh else TOOL_INSTRUCTIONS_SIMULATED
        
        agent_config = next((a for a in settings.AGENTS if a["id"] == agent_id), {})
        role = agent_config.get("role", "INVESTIGATOR")
        custom_prompt = agent_config.get("system_prompt", "")

        if role.startswith("CUSTOM_") and custom_prompt:
            sys_prompt = custom_prompt + "\n\n" + tool_rules
        else:
            behavior = ROLE_DEFINITIONS.get(role, ROLE_DEFINITIONS["INVESTIGATOR"])
            sys_prompt = behavior + "\n\n" + tool_rules

        context = f"Current incident: {scenario.get('description', '')}\n"
        
        other_agents = [a["id"] for a in settings.AGENTS if a["id"] != agent_id]
        if other_agents:
            context += f"Other agents in this investigation: {', '.join(other_agents)}\n"
        
        agent_configs = {a["id"]: a for a in settings.AGENTS}
        for other_id in other_agents:
            other_msgs = episode_state.messages_by_agent.get(other_id, [])
            if other_msgs:
                other_role = agent_configs.get(other_id, {}).get("role", "AGENT")
                last_msg = other_msgs[-1] if other_msgs else ""
                context += f"\n[{other_role}] {other_id}'s latest insight: {last_msg[:300]}...\n"
        
        if hasattr(episode_state, 'clues_found') and episode_state.clues_found:
            context += f"\nClues discovered so far:\n"
            for clue in episode_state.clues_found[-5:]:
                context += f"- {clue[:200]}\n"
        
        messages = [{"role": "system", "content": sys_prompt}]
        
        recent_msgs = episode_state.all_messages[-6:]
        if recent_msgs:
            context += "\nRecent conversation history:\n"
            for i, m in enumerate(recent_msgs[-4:]):
                if len(m) > 150:
                    m = m[:150] + "..."
                context += f"- {m}\n"
                
        messages.append({"role": "user", "content": context})
        
        full_response = ""
        last_error = None
        
        for attempt in range(max_retries + 1):
            try:
                stream = await client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    max_tokens=2048,
                    timeout=120.0,
                    stream=True
                )
                async for chunk in stream:
                    content = chunk.choices[0].delta.content or ""
                    if content:
                        full_response += content
                        yield content
                return
            except Exception as e:
                last_error = e
                logger.warning(f"Attempt {attempt + 1}/{max_retries + 1} failed for {model_name}: {e}")
                if attempt < max_retries:
                    await asyncio.sleep(2 ** attempt)
        
        logger.error(f"All retries exhausted for {model_name}: {last_error}")
        yield f"I encountered an error: {last_error}. Please verify the model endpoint is accessible."
