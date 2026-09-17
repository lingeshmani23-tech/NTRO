from backend.services.demo.dataset import generate_demo_analysis_result
from backend.services.reports.json_report import generate_json_report
from backend.services.reports.pdf_report import generate_pdf_report


def test_json_report_generation():
    res = generate_demo_analysis_result()
    json_str = generate_json_report(res)
    assert res.analysis_id in json_str
    assert "SMTP-001" in json_str


def test_pdf_report_generation():
    res = generate_demo_analysis_result()
    pdf_bytes = generate_pdf_report(res)
    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b"%PDF")
