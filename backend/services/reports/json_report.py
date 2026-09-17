import json
import time
from backend.models.schemas import AnalysisResult


def generate_json_report(result: AnalysisResult) -> str:
    """
    Generates structured JSON export of complete normalized analysis result.
    """
    data = {
        "tool": "SecureMailScope",
        "report_type": "Cryptographic Email Security Assessment",
        "report_version": "1.0.0",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "analysis": result.model_dump(),
    }
    return json.dumps(data, indent=2, default=str)

