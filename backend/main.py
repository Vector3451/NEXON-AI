import os
import asyncio
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import subprocess

from config import settings
from utils.logger import logger
from utils.hardware import check_hardware
from api.routes import openenv, websocket, config_routes, scenario_routes, model_routes

app = FastAPI(title="NEXUS Backend API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(openenv.router)
app.include_router(websocket.router)
app.include_router(config_routes.router)
app.include_router(scenario_routes.router)
app.include_router(model_routes.router)

# ── Health check (required by HF Space automated ping) ─────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "env": "nexus-incident-investigation"}

@app.get("/api")
async def root():
    return {"name": "NEXUS", "version": "1.0.0", "status": "running"}

# Serve frontend statically if available
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(frontend_dist):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/")
    @app.get("/{catchall:path}")
    async def serve_frontend(catchall: str = ""):
        return FileResponse(os.path.join(frontend_dist, "index.html"))

async def check_ollama():
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(settings.OLLAMA_BASE_URL.replace("/v1", ""), timeout=2.0)
            if resp.status_code == 200:
                logger.info(f"Ollama running at {settings.OLLAMA_BASE_URL}")
                return True
    except Exception:
        logger.error(f"Ollama is NOT reachable at {settings.OLLAMA_BASE_URL}.")
        logger.error("Please install from https://ollama.com and run it.")
    return False

@app.on_event("startup")
async def startup_event():
    # Print endpoints list
    logger.info("Starting NEXUS Backend...")
    for route in app.routes:
        logger.info(f"Endpoint: {route.path} ({getattr(route, 'methods', 'WS')})")

    hw = check_hardware()
    logger.info(f"Hardware setup: VRAM available = {hw['vram_available_gb']} GB. GPU Mode enabled = {hw['use_gpu']}")
    
    ollama_ok = await check_ollama()
    if ollama_ok:
        # Just check models via httpx to Ollama's local tags
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(settings.OLLAMA_BASE_URL.replace("/v1", "/api/tags"))
                models = [m["name"] for m in resp.json().get("models", [])]
                if settings.AGENT_A_MODEL not in models:
                    logger.warning(f"Default Agent A model {settings.AGENT_A_MODEL} not found. Run: ollama pull {settings.AGENT_A_MODEL}")
                if settings.AGENT_B_MODEL not in models:
                    logger.warning(f"Default Agent B model {settings.AGENT_B_MODEL} not found. Run: ollama pull {settings.AGENT_B_MODEL}")
            except Exception:
                pass
                
    # Run MCP server in bg
    def run_mcp():
        base_dir = os.path.dirname(__file__)
        subprocess.Popen([os.sys.executable, "-m", "tools.tool_server"], cwd=base_dir)
    
    run_mcp()

if __name__ == "__main__":
    try:
        uvicorn.run(app, host=settings.HOST, port=settings.PORT)
    except Exception as e:
        import traceback
        print(f"FATAL ERROR AT STARTUP: {str(e)}")
        traceback.print_exc()
        os._exit(1)
