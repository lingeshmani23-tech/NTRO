import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "tshark_available" in data
    assert "llm_available" in data
    assert data["version"] == "1.0.0"


def test_demo_endpoint_and_retrievals():
    response = client.post("/api/demo")
    assert response.status_code == 200
    data = response.json()
    assert "analysis_id" in data
    analysis_id = data["analysis_id"]

    # Status check
    status_resp = client.get(f"/api/analyze/{analysis_id}/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "completed"

    # Analysis result check
    result_resp = client.get(f"/api/analyze/{analysis_id}")
    assert result_resp.status_code == 200
    res_data = result_resp.json()
    assert res_data["analysis_id"] == analysis_id
    assert "score" in res_data
    assert "findings" in res_data
    assert "sessions" in res_data

    # Sessions endpoint
    sessions_resp = client.get(f"/api/analyze/{analysis_id}/sessions")
    assert sessions_resp.status_code == 200
    assert isinstance(sessions_resp.json(), list)

    # Findings endpoint
    findings_resp = client.get(f"/api/analyze/{analysis_id}/findings")
    assert findings_resp.status_code == 200
    assert isinstance(findings_resp.json(), list)

    # Report JSON endpoint
    json_report_resp = client.get(f"/api/analyze/{analysis_id}/report/json")
    assert json_report_resp.status_code == 200
    assert "SecureMailScope" in json_report_resp.text

    # Report PDF endpoint
    pdf_report_resp = client.get(f"/api/analyze/{analysis_id}/report/pdf")
    assert pdf_report_resp.status_code == 200
    assert pdf_report_resp.headers["content-type"] == "application/pdf"


def test_invalid_upload_extension():
    response = client.post(
        "/api/analyze",
        files={"file": ("test.txt", b"dummy content", "text/plain")}
    )
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]


def test_empty_upload():
    response = client.post(
        "/api/analyze",
        files={"file": ("test.pcap", b"", "application/vnd.tcpdump.pcap")}
    )
    assert response.status_code == 400
    assert "Uploaded file is empty" in response.json()["detail"]
