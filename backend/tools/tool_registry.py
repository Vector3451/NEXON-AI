from typing import Callable, Dict, Any
from pydantic import BaseModel

from .tools.log_reader import tool_read_logs
from .tools.config_checker import tool_check_config
from .tools.database_query import tool_query_database
from .tools.service_status import tool_check_service_status
from .tools.run_diagnostic import tool_run_diagnostic
from .tools.fix_proposer import tool_propose_fix
from .tools.submit_resolution import tool_submit_resolution
from .tools.run_terminal import tool_run_terminal_command
from .tools.update_config import tool_update_config
from .tools.restart_service import tool_restart_service
from .tools.fix_verifier import tool_verify_fix

class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, Callable] = {}
        self.register_defaults()

    def register_defaults(self):
        self.register_tool("read_logs", tool_read_logs)
        self.register_tool("check_config", tool_check_config)
        self.register_tool("query_database", tool_query_database)
        self.register_tool("check_service_status", tool_check_service_status)
        self.register_tool("run_diagnostic", tool_run_diagnostic)
        self.register_tool("propose_fix", tool_propose_fix)
        self.register_tool("submit_resolution", tool_submit_resolution)
        self.register_tool("run_terminal_command", tool_run_terminal_command)
        self.register_tool("update_config", tool_update_config)
        self.register_tool("restart_service", tool_restart_service)
        self.register_tool("verify_fix", tool_verify_fix)

    def register_tool(self, name: str, func: Callable):
        self.tools[name] = func

    def call_tool(self, name: str, params: dict, scenario: dict, round_num: int, episode_state=None) -> str:
        if name not in self.tools:
            return f"Error: Tool '{name}' not found."
            
        func = self.tools[name]
        try:
            # Mutable state tools and diagnostic tools need episode_state
            if name in ["propose_fix", "submit_resolution", "update_config", "restart_service", "check_config", "read_logs"]:
                return func(params, scenario, round_num, episode_state)
            else:
                return func(params, scenario, round_num)
        except Exception as e:
            return f"Error executing tool '{name}': {str(e)}"

registry = ToolRegistry()
