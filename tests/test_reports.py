from backend.models.schemas import (
    ComplianceResult,
    FileInfo,
    ExtractedPackageData,
    ComplianceCheck,
    ComplianceScore,
    AIAssessment,
)
from backend.services.reports.json_report import generate_json_report
from backend.services.reports.pdf_report import generate_pdf_report


def get_dummy_result():
    return ComplianceResult(
        analysis_id="test-123",
        created_at="2026-09-17T12:00:00Z",
        data_source="test",
        file=FileInfo(name="test.png", size_bytes=1024, content_type="image/png"),
        extracted_data=ExtractedPackageData(
            mrp="MRP Rs. 100.00 (incl. of all taxes)",
            net_quantity="500 g",
            manufacturer_details="Test Pvt Ltd, New Delhi - 110001",
            packing_date="05/2026",
            consumer_care_details="1800-111-222",
            country_of_origin="Country of Origin: India",
        ),
        checks=[
            ComplianceCheck(rule_id="LM-001", field="mrp", title="MRP", status="PASS", severity="CRITICAL", message="OK", recommendation="OK", reference="Rule 6"),
        ],
        score=ComplianceScore(score=100, rating="COMPLIANT", ledger=[]),
        ai_assessment=AIAssessment(
            provider="fallback",
            executive_summary="Fully compliant",
            why_it_matters="Legal requirement",
            top_priorities=["Maintain compliance"],
            remediation=[],
        ),
    )


def test_json_report_generation():
    res = get_dummy_result()
    json_str = generate_json_report(res)
    assert "test-123" in json_str
    assert "MRP Rs. 100.00" in json_str


def test_pdf_report_generation():
    res = get_dummy_result()
    pdf_bytes = generate_pdf_report(res)
    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b"%PDF")
