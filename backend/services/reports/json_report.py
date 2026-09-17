import json
from backend.models.schemas import ComplianceResult


def generate_json_report(result: ComplianceResult) -> str:
    """
    Generates structured JSON report for Legal Metrology compliance inspection.
    """
    return json.dumps(result.model_dump(), indent=2, default=str)
