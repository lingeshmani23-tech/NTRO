import json
from backend.models.schemas import AnalysisResult


def generate_json_report(result: AnalysisResult) -> str:
    """
    Generates structured JSON export of complete normalized analysis result.
    """
    return json.dumps(result.model_dump(), indent=2, default=str)
