from backend.models.schemas import ExtractedPackageData
from backend.services.rules.metrology_rules import MetrologyRuleEngine


def test_metrology_rule_engine_compliant():
    data = ExtractedPackageData(
        mrp="MRP Rs. 299.00 (incl. of all taxes)",
        net_quantity="1 kg / 1000 g",
        manufacturer_details="Shree Ganesh Foods Pvt. Ltd., Plot 12, GIDC Estate, Ahmedabad, Gujarat - 380015, India",
        packing_date="05/2026",
        consumer_care_details="Consumer Care Officer: Toll Free 1800-111-222, Email: care@ganeshfoods.com",
        country_of_origin="Country of Origin: India",
    )
    engine = MetrologyRuleEngine()
    checks = engine.evaluate(data)
    assert len(checks) == 6
    assert all(c.status == "PASS" for c in checks)


def test_metrology_rule_engine_non_compliant():
    data = ExtractedPackageData(
        mrp="MRP Rs. 149.00",  # Missing 'incl. of all taxes'
        net_quantity="500 g",
        manufacturer_details="Packers Pvt Ltd",  # Incomplete address
        packing_date="04/2026",
        consumer_care_details=None,  # Missing
        country_of_origin=None,  # Missing
    )
    engine = MetrologyRuleEngine()
    checks = engine.evaluate(data)
    assert len(checks) == 6
    statuses = {c.rule_id: c.status for c in checks}
    assert statuses["LM-001"] == "WARNING"
    assert statuses["LM-003"] == "WARNING"
    assert statuses["LM-005"] == "FAIL"
    assert statuses["LM-006"] == "FAIL"
