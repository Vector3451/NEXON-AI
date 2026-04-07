import socket
import paramiko
from config import settings
from utils.logger import logger


def execute_ssh_command(command: str, timeout: int = 15) -> dict:
    """
    Execute a shell command on the configured SSH Lab Node.
    Returns a dict with stdout, stderr, exit_code, and a formatted result string.
    """
    if not settings.SSH_HOST or not settings.SSH_USER:
        return {
            "stdout": "",
            "stderr": "SSH Lab Node not configured. Set SSH_HOST and SSH_USER in Settings.",
            "exit_code": -1,
            "result": "[SSH ERROR] Lab node credentials are not configured."
        }

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(
            hostname=settings.SSH_HOST,
            port=settings.SSH_PORT,
            username=settings.SSH_USER,
            password=settings.SSH_PASSWORD,
            timeout=timeout,
            look_for_keys=False,
            allow_agent=False
        )
        _, stdout, stderr = client.exec_command(command, timeout=timeout)
        exit_code = stdout.channel.recv_exit_status()
        out = stdout.read().decode("utf-8", errors="replace").strip()
        err = stderr.read().decode("utf-8", errors="replace").strip()

        result_parts = []
        if out:
            result_parts.append(f"stdout:\n{out}")
        if err:
            result_parts.append(f"stderr:\n{err}")
        result_parts.append(f"exit_code: {exit_code}")

        return {
            "stdout": out,
            "stderr": err,
            "exit_code": exit_code,
            "result": "\n".join(result_parts) if result_parts else "(no output)"
        }
    except (paramiko.AuthenticationException, paramiko.SSHException) as e:
        msg = f"[SSH AUTH ERROR] {e}"
        logger.error(msg)
        return {"stdout": "", "stderr": str(e), "exit_code": -1, "result": msg}
    except socket.timeout:
        msg = f"[SSH TIMEOUT] Connection to {settings.SSH_HOST}:{settings.SSH_PORT} timed out."
        logger.error(msg)
        return {"stdout": "", "stderr": "timeout", "exit_code": -1, "result": msg}
    except Exception as e:
        msg = f"[SSH ERROR] {e}"
        logger.error(msg)
        return {"stdout": "", "stderr": str(e), "exit_code": -1, "result": msg}
    finally:
        client.close()
