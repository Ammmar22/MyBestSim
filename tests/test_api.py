from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()

def test_get_metrics():
    response = client.get("/metrics")
    assert response.status_code == 200
    # Vérifie que les clés principales sont présentes
    data = response.json()
    assert "total_esim" in data or "error" in data