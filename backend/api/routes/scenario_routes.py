from fastapi import APIRouter
from pydantic import BaseModel
from scenarios.scenario_loader import scenario_loader

router = APIRouter()

class SelectScenarioRequest(BaseModel):
    scenario_id: str

@router.get("/scenarios")
def list_scenarios():
    scenarios = scenario_loader.get_all_scenarios(include_root_cause=False)
    # Group by difficulty
    grouped = {"easy": [], "medium": [], "hard": []}
    for s in scenarios:
        grouped[s["difficulty"]].append(s)
    return grouped

@router.post("/scenario/select")
def select_scenario(req: SelectScenarioRequest):
    return {"message": f"Scenario {req.scenario_id} selected for next episode."}
