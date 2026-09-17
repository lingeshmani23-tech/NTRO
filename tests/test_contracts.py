import os
import re
from backend.models.schemas import (
    EvidenceItem,
    StartTLSSummary,
    CertificateInfo,
    AuthenticationSummary,
    NormalizedSession,
    FindingEvidence,
    Finding,
    ScoreLedgerItem,
    RiskScore,
    RemediationAction,
    AIAssessment,
    FileInfo,
    TotalsSummary,
    AnalysisResult,
    StageProgress,
    StatusResponse,
    HealthResponse,
)

PYDANTIC_MODELS = [
    EvidenceItem,
    StartTLSSummary,
    CertificateInfo,
    AuthenticationSummary,
    NormalizedSession,
    FindingEvidence,
    Finding,
    ScoreLedgerItem,
    RiskScore,
    RemediationAction,
    AIAssessment,
    FileInfo,
    TotalsSummary,
    AnalysisResult,
    StageProgress,
    StatusResponse,
    HealthResponse,
]

TS_TYPES_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "types", "api.ts")


def test_contract_field_parity():
    assert os.path.exists(TS_TYPES_PATH), f"TS file not found at {TS_TYPES_PATH}"
    with open(TS_TYPES_PATH, "r", encoding="utf-8") as f:
        ts_content = f.read()

    for model in PYDANTIC_MODELS:
        fields = model.model_fields.keys()
        for field_name in fields:
            # Assert field name exists in TS file as a key or property name
            assert re.search(r"\b" + re.escape(field_name) + r"\b", ts_content), (
                f"Model field '{field_name}' from {model.__name__} not found in TS api.ts"
            )
