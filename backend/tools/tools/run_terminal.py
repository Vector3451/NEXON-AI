from utils.ssh_client import execute_ssh_command


def tool_run_terminal_command(params: dict, scenario: dict, round_num: int) -> str:
    """
    Execute a real shell command on the SSH-connected Lab Node.
    Only active when EXECUTION_MODE is 'ssh'.
    """
    command = params.get("command", "").strip()

    if not command:
        return "Error: No command provided. Usage: run_terminal_command(command=\"ls -la\")"

    # Basic safety: block clearly destructive commands at the tool layer
    blocked = ["rm -rf /", "mkfs", "dd if=", "> /dev/sda", "shutdown", "reboot", "halt"]
    if any(danger in command for danger in blocked):
        return f"[BLOCKED] Potentially destructive command rejected: '{command}'"

    result = execute_ssh_command(command)
    return result["result"]
