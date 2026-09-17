import json
from backend.services.demo.dataset import generate_demo_analysis_result
from backend.services.reports.json_report import generate_json_report
from backend.services.reports.pdf_report import generate_pdf_report


def test_json_report_contract():
    result = generate_demo_analysis_result()
    json_str = generate_json_report(result)
    parsed = json.loads(json_str)

    required_keys = [
        "analysis_id",
        "created_at",
        "data_source",
        "file",
        "status",
        "protocol_stats",
        "totals",
        "sessions",
        "findings",
        "score",
        "ai",
        "errors",
        "warnings",
    ]
    for key in required_keys:
        assert key in parsed, f"Missing key '{key}' in JSON report output"

    assert parsed["data_source"] == "synthetic"
    assert parsed["score"]["score"] == 40


def test_pdf_report_generation():
    result = generate_demo_analysis_result()
    pdf_bytes = generate_pdf_report(result)

    # Magic header assertion
    assert pdf_bytes.startswith(b"%PDF"), "PDF output does not start with %PDF magic header"

    # Size assertion (> 20 KB)
    assert len(pdf_bytes) > 20000, f"PDF report size too small ({len(pdf_bytes)} bytes <= 20000)"
