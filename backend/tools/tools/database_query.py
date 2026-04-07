from pydantic import BaseModel

class QueryDatabaseParams(BaseModel):
    query: str

def tool_query_database(params: dict, scenario: dict, round_num: int) -> str:
    query = params.get("query", "").lower()
    
    clue_map = scenario.get("clue_map", {})
    for key, value in clue_map.items():
        if key.startswith("query_database:"):
            # e.g. "query_database:user_profiles"
            target = key.split(":")[1]
            if target in query:
                return value
                
    return "Query executed successfully. 0 rows affected or standard format data returned. No anomalies detected."
