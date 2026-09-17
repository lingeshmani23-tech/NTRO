from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_unsupported_extension():
    response = client.post(
        "/api/analyze",
        files={"file": ("test_file.txt", b"not a pcap content", "text/plain")},
    )
    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "UNSUPPORTED_EXTENSION"


def test_file_too_large(monkeypatch):
    from backend.config import settings

    monkeypatch.setattr(settings, "MAX_UPLOAD_MB", 1)  # Set 1MB limit

    # 2MB payload
    oversized_data = b"0" * (2 * 1024 * 1024)
    response = client.post(
        "/api/analyze",
        files={"file": ("large_capture.pcap", oversized_data, "application/octet-stream")},
    )
    assert response.status_code == 413
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "FILE_TOO_LARGE"


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "tshark_available" in data
    assert "ai_provider" in data
