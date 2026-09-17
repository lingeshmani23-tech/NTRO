import os
import json
import re
from typing import List, Dict, Any, Optional
from backend.models.schemas import ExtractedPackageData, ComplianceCheck

RULES_JSON_CANDIDATES = [
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "rules", "metrology_rules.json"),
    os.path.join(os.path.dirname(__file__), "..", "..", "rules", "metrology_rules.json"),
    os.path.join(os.path.dirname(__file__), "..", "rules", "metrology_rules.json"),
]


def load_metrology_rules() -> List[Dict[str, Any]]:
    for path in RULES_JSON_CANDIDATES:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    # Default fallback rule definitions if file not loaded
    return [
        {
            "id": "LM-001",
            "title": "Maximum Retail Price (MRP) Declaration",
            "field": "mrp",
            "severity": "CRITICAL",
            "condition_key": "check_mrp",
            "description": "Declaration of Maximum Retail Price (MRP) with inclusive of all taxes notice.",
            "recommendation": "Print MRP in format 'MRP Rs. XX.XX (incl. of all taxes)' on the principal display panel.",
            "reference": "Legal Metrology (Packaged Commodities) Rules, 2011 Rule 6(1)(e)",
        },
        {
            "id": "LM-002",
            "title": "Net Quantity Declaration",
            "field": "net_quantity",
            "severity": "CRITICAL",
            "condition_key": "check_net_quantity",
            "description": "Declaration of Net Quantity in standard units of weight, volume, or count.",
            "recommendation": "Declare net quantity using standard units (g, kg, ml, L, N, or pcs).",
            "reference": "Legal Metrology (Packaged Commodities) Rules, 2011 Rule 6(1)(b)",
        },
        {
            "id": "LM-003",
            "title": "Manufacturer / Packer Details",
            "field": "manufacturer_details",
            "severity": "CRITICAL",
            "condition_key": "check_manufacturer_details",
            "description": "Name and complete registered address of the manufacturer, packer, or importer.",
            "recommendation": "Provide full name and complete address including city, state, and pin code.",
            "reference": "Legal Metrology (Packaged Commodities) Rules, 2011 Rule 6(1)(a)",
        },
        {
            "id": "LM-004",
            "title": "Date of Manufacture / Packing",
            "field": "packing_date",
            "severity": "HIGH",
            "condition_key": "check_packing_date",
            "description": "Month and Year of manufacture, packing, or import (MM/YYYY).",
            "recommendation": "Print Month and Year of manufacture/packing clearly.",
            "reference": "Legal Metrology (Packaged Commodities) Rules, 2011 Rule 6(1)(d)",
        },
        {
            "id": "LM-005",
            "title": "Consumer Care Details",
            "field": "consumer_care_details",
            "severity": "HIGH",
            "condition_key": "check_consumer_care_details",
            "description": "Name/designation, address, telephone number, and email of consumer grievance officer.",
            "recommendation": "Include Consumer Care helpline number, email ID, and contact address on package.",
            "reference": "Legal Metrology (Packaged Commodities) Rules, 2011 Rule 6(2)",
        },
        {
            "id": "LM-006",
            "title": "Country of Origin Declaration",
            "field": "country_of_origin",
            "severity": "MEDIUM",
            "condition_key": "check_country_of_origin",
            "description": "Declaration of Country of Origin for imported and domestic packaged commodities.",
            "recommendation": "Print 'Country of Origin: India' or 'Made in [Country]' on the package.",
            "reference": "Legal Metrology (Packaged Commodities) Amendment Rules, 2017 Rule 6(1)(n)",
        },
    ]


class MetrologyRuleEngine:
    def __init__(self, rules_def: Optional[List[Dict[str, Any]]] = None):
        self.rules_def = rules_def or load_metrology_rules()

    def evaluate(self, data: ExtractedPackageData) -> List[ComplianceCheck]:
        checks: List[ComplianceCheck] = []

        for rule in self.rules_def:
            rid = rule["id"]
            field = rule["field"]
            title = rule["title"]
            severity = rule["severity"]
            recommendation = rule["recommendation"]
            reference = rule["reference"]

            if rid == "LM-001":  # MRP Check
                if not data.mrp:
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="FAIL",
                            severity="CRITICAL",
                            message="Maximum Retail Price (MRP) declaration is completely missing from label.",
                            observed_value=None,
                            recommendation=recommendation,
                            reference=reference,
                        )
                    )
                elif "tax" not in data.mrp.lower() and "incl" not in data.mrp.lower():
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="WARNING",
                            severity="HIGH",
                            message="MRP declared but missing mandatory 'inclusive of all taxes' statement.",
                            observed_value=data.mrp,
                            recommendation="Append '(incl. of all taxes)' to MRP declaration.",
                            reference=reference,
                        )
                    )
                else:
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="PASS",
                            severity=severity,
                            message="Valid MRP declaration with tax inclusion statement.",
                            observed_value=data.mrp,
                            recommendation=recommendation,
                            reference=reference,
                        )
                    )

            elif rid == "LM-002":  # Net Quantity Check
                if not data.net_quantity:
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="FAIL",
                            severity="CRITICAL",
                            message="Net Quantity declaration is missing.",
                            observed_value=None,
                            recommendation=recommendation,
                            reference=reference,
                        )
                    )
                elif not re.search(r"\b(g|kg|ml|l|ltr|liter|pcs|N|count)\b", data.net_quantity, re.IGNORECASE):
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="WARNING",
                            severity="MEDIUM",
                            message="Net quantity format does not specify standard metric unit (g, kg, ml, L, N).",
                            observed_value=data.net_quantity,
                            recommendation="Use standard metric units specified in Legal Metrology Schedule 2.",
                            reference=reference,
                        )
                    )
                else:
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="PASS",
                            severity=severity,
                            message="Valid Net Quantity declaration using standard metric units.",
                            observed_value=data.net_quantity,
                            recommendation=recommendation,
                            reference=reference,
                        )
                    )

            elif rid == "LM-003":  # Manufacturer Details Check
                if not data.manufacturer_details:
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="FAIL",
                            severity="CRITICAL",
                            message="Manufacturer / Packer name and address are missing.",
                            observed_value=None,
                            recommendation=recommendation,
                            reference=reference,
                        )
                    )
                elif len(data.manufacturer_details.strip()) < 25 or not re.search(r"\b(\d{6}|India|State|Pin|Pvt|Ltd|Plot|Sector|Street|Road|GIDC|Estate)\b", data.manufacturer_details, re.IGNORECASE):
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="WARNING",
                            severity="HIGH",
                            message="Manufacturer address appears incomplete (missing city, state, street, or PIN code).",
                            observed_value=data.manufacturer_details,
                            recommendation="Provide full street address, city, state, and 6-digit postal code.",
                            reference=reference,
                        )
                    )
                else:
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="PASS",
                            severity=severity,
                            message="Complete Manufacturer / Packer details with address.",
                            observed_value=data.manufacturer_details,
                            recommendation=recommendation,
                            reference=reference,
                        )
                    )


            elif rid == "LM-004":  # Packing Date Check
                if not data.packing_date:
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="FAIL",
                            severity="HIGH",
                            message="Date of Manufacture / Packing is missing.",
                            observed_value=None,
                            recommendation=recommendation,
                            reference=reference,
                        )
                    )
                else:
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="PASS",
                            severity=severity,
                            message="Valid Date of Manufacture / Packing declaration.",
                            observed_value=data.packing_date,
                            recommendation=recommendation,
                            reference=reference,
                        )
                    )

            elif rid == "LM-005":  # Consumer Care Details Check
                if not data.consumer_care_details:
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="FAIL",
                            severity="HIGH",
                            message="Consumer Care helpline / email / address details are missing.",
                            observed_value=None,
                            recommendation=recommendation,
                            reference=reference,
                        )
                    )
                elif not re.search(r"(@|1800|\d{10}|phone|email|toll)", data.consumer_care_details, re.IGNORECASE):
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="WARNING",
                            severity="MEDIUM",
                            message="Consumer Care details missing explicit phone number or email address.",
                            observed_value=data.consumer_care_details,
                            recommendation="Include toll-free helpline number and support email address.",
                            reference=reference,
                        )
                    )
                else:
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="PASS",
                            severity=severity,
                            message="Complete Consumer Care contact information provided.",
                            observed_value=data.consumer_care_details,
                            recommendation=recommendation,
                            reference=reference,
                        )
                    )

            elif rid == "LM-006":  # Country of Origin Check
                if not data.country_of_origin:
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="FAIL",
                            severity="MEDIUM",
                            message="Country of Origin declaration is missing.",
                            observed_value=None,
                            recommendation=recommendation,
                            reference=reference,
                        )
                    )
                else:
                    checks.append(
                        ComplianceCheck(
                            rule_id=rid,
                            field=field,
                            title=title,
                            status="PASS",
                            severity=severity,
                            message="Valid Country of Origin declaration.",
                            observed_value=data.country_of_origin,
                            recommendation=recommendation,
                            reference=reference,
                        )
                    )

        return checks
