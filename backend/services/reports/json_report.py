import json
from backend.models.schemas import AnalysisResult


def generate_json_report(result: AnalysisResult) -> str:
    """
    Exports full AnalysisResult object into pretty-printed JSON string.
    """
    return json.dumps(result.model_dump(), indent=2, default=str)
