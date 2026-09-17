from backend.services.ocr.ocr_engine import extract_package_label, parse_raw_text_to_declarations


def test_ocr_label_extraction_preset():
    data = extract_package_label(file_name="organic_wheat_atta_pack.png")
    assert data.mrp is not None
    assert "299" in data.mrp
    assert data.net_quantity is not None
    assert "1 kg" in data.net_quantity
    assert data.manufacturer_details is not None
    assert data.country_of_origin == "Country of Origin: India"


def test_ocr_raw_text_parsing():
    raw = (
        "TEST PRODUCT\n"
        "MRP Rs. 99.00 (incl. of all taxes)\n"
        "Net Qty: 250 g\n"
        "Mfd by: Test Manufacturer Pvt Ltd, Sector 5, New Delhi - 110001, India\n"
        "Mfg Date: 06/2026\n"
        "Consumer Care: 1800-999-888, Email: support@test.com\n"
        "Country of Origin: India"
    )
    data = parse_raw_text_to_declarations(raw)
    assert data.mrp == "MRP Rs. 99.00 (incl. of all taxes)"
    assert data.net_quantity == "Net Qty: 250 g"
    assert data.country_of_origin == "Country of Origin: India"
