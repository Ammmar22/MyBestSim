
import os

import httpx

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:latest")


async def ask_ollama(question: str, evidence: dict) -> str:
    prompt = f"""
Tu es l'assistant analytique du catalogue eSIM MyBestSim.

Réponds à la question uniquement à partir des données vérifiées ci-dessous.
N'invente aucun chiffre, prix ou nom de fournisseur.
Si les données sont insuffisantes, précise-le.
Réponds dans la langue de la question.

Données vérifiées :
{evidence}

Question :
{question}
"""

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Tu es un analyste de données précis. "
                    "N'invente jamais de faits ni de statistiques."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "stream": False,
    }

    headers = {}
    if OLLAMA_API_KEY:
        headers["X-API-Key"] = OLLAMA_API_KEY

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OLLAMA_URL}/api/chat",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()

    return response.json()["message"]["content"]
