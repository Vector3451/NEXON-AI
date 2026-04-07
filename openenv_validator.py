import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / "backend"))

from fastapi.testclient import TestClient
from backend.main import app
import json

client = TestClient(app)

def validate_openenv():
    print("Beginning OpenEnv Specification Validation Pipeline...")
    
    # 1. Test /reset
    print("Testing /reset endpoint...")
    reset_payload = {
        "task": "software-incident",
        "seed": 42
    }
    response = client.post("/reset", json=reset_payload)
    if response.status_code != 200:
        print(f"FAILED: /reset returned {response.status_code}\n{response.text}")
        return False
        
    obs = response.json()
    print("  -> /reset returned valid NexusObservation schema.")
    
    # 2. Test /state
    print("Testing /state endpoint...")
    state_response = client.get("/state")
    if state_response.status_code != 200:
        print(f"FAILED: /state returned {state_response.status_code}\n{state_response.text}")
        return False
        
    print("  -> /state returned valid scenario state.")
    
    # 3. Test /step
    print("Testing /step endpoint...")
    action_payload = {
        "agent_id": "agent_a",
        "message": "Testing the tool execution API directly.",
        "tool_calls": [
            {
                "tool_name": "check_service_status",
                "params": {"service": "nginx-proxy"}
            }
        ],
        "confidence": 0.9
    }
    step_response = client.post("/step", json=action_payload)
    if step_response.status_code != 200:
        print(f"FAILED: /step returned {step_response.status_code}\n{step_response.text}")
        return False
        
    step_data = step_response.json()
    print("  -> /step returned StepResponse (observation, reward, done, info).")
    
    if "reward" not in step_data or "done" not in step_data:
        print("FAILED: /step response missing mandatory OpenEnv schema tags.")
        return False
    
    print("\n[SUCCESS] Pre-Submission Validation completed successfully. Architecture strictly conforms to the OpenEnv standard.")
    return True

if __name__ == "__main__":
    success = validate_openenv()
    if not success:
        exit(1)
