import json
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
from utils.logger import logger

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, payload: dict):
        message = {
            "type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            **payload
        }
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending broadcast: {e}")

manager = ConnectionManager()
broadcast = manager.broadcast

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        from core.episode_manager import episode_manager
        from api.routes.openenv import start_simulation
        
        while True:
            data = await websocket.receive_text()
            try:
                cmd = json.loads(data)
                action = cmd.get("action")
                
                if action == "start":
                    logger.info("UI Command: START")
                    await start_simulation()
                elif action == "pause":
                    episode_manager.is_paused = not episode_manager.is_paused
                    logger.info(f"UI Command: PAUSE -> {episode_manager.is_paused}")
                    # Broadcast both the pause flag and a status string for the UI header
                    await broadcast("system_status", {
                        "paused": episode_manager.is_paused,
                        "status": "PAUSED" if episode_manager.is_paused else "INVESTIGATING"
                    })
                elif action == "reset":
                    logger.info("UI Command: RESET")
                    await episode_manager.reset(task="software-incident")
                    await broadcast("system_status", {"paused": False, "status": "READY", "active": false})
                elif action == "force_end":
                    logger.info("UI Command: FORCE_END")
                    if episode_manager.env and episode_manager.env.active_episode:
                        episode_manager.env.active_episode.done = True
                        episode_manager.env.active_episode.fix_verified = True
                        # Immediately update local status and broadcast to UI
                        await broadcast("system_status", {"status": "COMPLETED", "active": False})
            except Exception as e:
                logger.error(f"Error handling WS command: {e}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
