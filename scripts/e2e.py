import sys
import os
import time
import subprocess

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.services.demo.dataset import generate_demo_analysis_result
from backend.services.reports.pdf_report import generate_pdf_report


def run_e2e_evaluation():
    print("==================================================")
    print("   SECUREMAILSCOPE END-TO-END ACCEPTANCE SUITE   ")
    print("==================================================")

    # 1. Run Unit & Integration PyTest Suite
    print("\n[Step 1/3] Running PyTest Suite...")
    res = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/"],
        capture_output=True,
        text=True,
        check=False,
    )
    print(res.stdout)
    if res.returncode != 0:
        print(res.stderr)
        raise RuntimeError("PyTest suite failed!")
    print("[PASS] All PyTest unit and integration tests passed.")

    # 2. Run API Smoke Test
    print("\n[Step 2/3] Running API Smoke Test...")
    res_smoke = subprocess.run(
        [sys.executable, "scripts/smoke_api.py"],
        capture_output=True,
        text=True,
        check=False,
    )
    print(res_smoke.stdout)
    if res_smoke.returncode != 0:
        print(res_smoke.stderr)
        raise RuntimeError("API Smoke test failed!")
    print("[PASS] API Smoke test completed successfully.")

    # 3. Assert Golden Score Metrics & Report Signatures
    print("\n[Step 3/3] Asserting Golden Demo Result & PDF Report...")
    demo_res = generate_demo_analysis_result()
    assert demo_res.score.score == 40, f"Expected 40, got {demo_res.score.score}"
    assert demo_res.score.rating == "HIGH RISK", f"Expected HIGH RISK, got {demo_res.score.rating}"
    assert len(demo_res.findings) == 11, f"Expected 11 findings, got {len(demo_res.findings)}"

    pdf_bytes = generate_pdf_report(demo_res)
    assert pdf_bytes.startswith(b"%PDF"), "PDF magic header missing"
    assert len(pdf_bytes) > 20000, f"PDF report size small ({len(pdf_bytes)} bytes)"

    print(f"[PASS] Golden Score verified: {demo_res.score.score} / {demo_res.score.rating}")
    print(f"[PASS] PDF Report verified: {len(pdf_bytes):,} bytes")
    print("\n==================================================")
    print("   E2E ACCEPTANCE SUITE COMPLETED SUCCESSFULLY    ")
    print("==================================================")


if __name__ == "__main__":
    run_e2e_evaluation()
