
import hmac
import os

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

RELAY_SECRET = os.environ.get("OLLAMA_RELAY_SECRET", "")
OLLAMA_LOCAL_URL = "http://127.0.0.1:11434/api/chat"


@app.post("/api/chat")
async def relay_chat(
    request: Request,
    x_api_key: str = Header(default=""),
):
    if not RELAY_SECRET or not hmac.compare_digest(
        x_api_key, RELAY_SECRET
    ):
        raise HTTPException(status_code=401, detail="Unauthorized")

    payload = await request.json()

    # N'autoriser que le modèle prévu pour ce projet.
    if payload.get("model") != "llama3.2:latest":
        raise HTTPException(status_code=400, detail="Model not allowed")

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                OLLAMA_LOCAL_URL,
                json=payload,
            )
            response.raise_for_status()
        return JSONResponse(content=response.json())

    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Local Ollama is unavailable",
        )
