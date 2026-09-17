import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def run_smoke_test():
    print("=== SECUREMAILSCOPE API Smoke Test ===")

    # 1. Health
    print("[1/8] GET /api/health...")
    r_health = client.get("/api/health")
    assert r_health.status_code == 200, f"Health failed: {r_health.text}"
    health_data = r_health.json()
    assert health_data["status"] == "ok"
    print(f"      Status OK. TShark available: {health_data['tshark_available']}, AI Provider: {health_data['ai_provider']}")

    # 2. Demo Trigger
    print("[2/8] POST /api/demo...")
    r_demo = client.post("/api/demo")
    assert r_demo.status_code == 202, f"Demo trigger failed: {r_demo.text}"
    analysis_id = r_demo.json()["analysis_id"]
    print(f"      Started demo analysis ID: {analysis_id}")

    # 3. Poll Status
    print("[3/8] Polling GET /api/analyze/{id}/status...")
    completed = False
    for _ in range(30):
        r_status = client.get(f"/api/analyze/{analysis_id}/status")
        assert r_status.status_code == 200
        st_data = r_status.json()
        print(f"      Status: {st_data['status']} ({st_data['percent']}%), Stage: {st_data['current_stage']}")
        if st_data["status"] == "completed":
            completed = True
            break
        time.sleep(0.3)

    assert completed, "Demo analysis failed to reach completed state within timeout"

    # 4. GET Result
    print("[4/8] GET /api/analyze/{id}...")
    r_result = client.get(f"/api/analyze/{analysis_id}")
    assert r_result.status_code == 200
    res_data = r_result.json()
    assert res_data["score"]["score"] == 40
    assert res_data["score"]["rating"] == "HIGH RISK"
    assert res_data["data_source"] == "synthetic"
    print(f"      Result Score: {res_data['score']['score']} ({res_data['score']['rating']})")

    # 5. GET Sessions
    print("[5/8] GET /api/analyze/{id}/sessions...")
    r_sess = client.get(f"/api/analyze/{analysis_id}/sessions")
    assert r_sess.status_code == 200
    sessions = r_sess.json()
    assert len(sessions) == 7
    print(f"      Retrieved {len(sessions)} normalized sessions")

    # 6. GET Findings (filtered CRITICAL)
    print("[6/8] GET /api/analyze/{id}/findings?severity=CRITICAL...")
    r_find = client.get(f"/api/analyze/{analysis_id}/findings?severity=CRITICAL")
    assert r_find.status_code == 200
    crit_findings = r_find.json()
    assert len(crit_findings) == 3
    print(f"      Retrieved {len(crit_findings)} CRITICAL findings")

    # 7. GET JSON Report
    print("[7/8] GET /api/analyze/{id}/report/json...")
    r_json = client.get(f"/api/analyze/{analysis_id}/report/json")
    assert r_json.status_code == 200
    assert "application/json" in r_json.headers["content-type"]
    print("      JSON report generated successfully")

    # 8. GET PDF Report
    print("[8/8] GET /api/analyze/{id}/report/pdf...")
    r_pdf = client.get(f"/api/analyze/{analysis_id}/report/pdf")
    assert r_pdf.status_code == 200
    assert "application/pdf" in r_pdf.headers["content-type"]
    assert r_pdf.content.startswith(b"%PDF")
    assert len(r_pdf.content) > 20000
    print(f"      PDF report generated successfully ({len(r_pdf.content):,} bytes)")

    print("\nSUCCESS: All API smoke tests passed cleanly!")


if __name__ == "__main__":
    run_smoke_test()
