import os
import json
from pathlib import Path
from typing import Dict, List

SCENARIOS_DIR = Path(__file__).resolve().parent / "data"

class ScenarioLoader:
    def __init__(self):
        self.scenarios: Dict[str, Dict] = {}
        self._load_all_scenarios()

    def _load_all_scenarios(self):
        for difficulty in ["easy", "medium", "hard"]:
            dir_path = SCENARIOS_DIR / difficulty
            if dir_path.exists():
                for file_path in dir_path.glob("*.json"):
                    try:
                        with open(file_path, "r") as f:
                            data = json.load(f)
                            self.scenarios[data["id"]] = data
                    except Exception as e:
                        print(f"Error loading {file_path}: {e}")

    def get_scenario(self, scenario_id: str) -> Dict:
        return self.scenarios.get(scenario_id)

    def get_all_scenarios(self, include_root_cause: bool = False) -> List[Dict]:
        all_scenarios = list(self.scenarios.values())
        if not include_root_cause:
            # Strip out root_cause, correct_fix, red_herrings, clue_map, grading_criteria
            safe_scenarios = []
            for sc in all_scenarios:
                safe_sc = {
                    "id": sc["id"],
                    "title": sc["title"],
                    "difficulty": sc["difficulty"],
                    "domain": sc["domain"],
                    "description": sc["description"],
                    "context": sc["context"],
                    "symptoms": sc["symptoms"],
                    "available_services": sc["available_services"]
                }
                safe_scenarios.append(safe_sc)
            return safe_scenarios
        return all_scenarios

    def get_scenarios_by_difficulty(self, difficulty: str) -> List[Dict]:
        return [s for s in self.scenarios.values() if s["difficulty"] == difficulty]

scenario_loader = ScenarioLoader()
