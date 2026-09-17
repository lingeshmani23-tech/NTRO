from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ExtractedPackageData(BaseModel):
    mrp: Optional[str] = Field(default=None, description="Maximum Retail Price declaration")
    net_quantity: Optional[str] = Field(default=None, description="Declared Net Quantity")
    manufacturer_details: Optional[str] = Field(default=None, description="Manufacturer/Packer name and address")
    packing_date: Optional[str] = Field(default=None, description="Month and year of manufacture/packing")
    consumer_care_details: Optional[str] = Field(default=None, description="Consumer care contact details")
    country_of_origin: Optional[str] = Field(default=None, description="Country of origin declaration")
    raw_text: Optional[str] = Field(default=None, description="Complete raw OCR text extracted from package label")
    confidence_scores: Dict[str, float] = Field(default_factory=dict, description="OCR extraction confidence scores per field")


class ComplianceCheck(BaseModel):
    rule_id: str
    field: str
    title: str
    status: str = Field(description="PASS, WARNING, or FAIL")
    severity: str = Field(description="CRITICAL, HIGH, MEDIUM, or LOW")
    message: str
    observed_value: Optional[str] = None
    recommendation: str
    reference: str


class ScoreLedgerItem(BaseModel):
    rule_id: str
    severity: str
    deduction: int
    reason: str


class ComplianceScore(BaseModel):
    score: int = Field(ge=0, le=100, description="Compliance score from 0 to 100")
    rating: str = Field(description="COMPLIANT, NEEDS_REVISION, or NON_COMPLIANT")
    ledger: List[ScoreLedgerItem] = Field(default_factory=list)


class RemediationAction(BaseModel):
    priority: int
    action: str
    rule_ids: List[str]


class AIAssessment(BaseModel):
    provider: str
    executive_summary: str
    why_it_matters: str
    top_priorities: List[str]
    remediation: List[RemediationAction]


class FileInfo(BaseModel):
    name: str
    size_bytes: int
    content_type: str = "image/png"


class StageProgress(BaseModel):
    stage: str
    status: str  # pending | in_progress | completed | failed
    detail: str
    updated_at: str


class StatusResponse(BaseModel):
    analysis_id: str
    status: str  # processing | completed | failed
    progress: List[StageProgress]


class ComplianceResult(BaseModel):
    analysis_id: str
    created_at: str
    data_source: str
    file: FileInfo
    extracted_data: ExtractedPackageData
    checks: List[ComplianceCheck]
    score: ComplianceScore
    ai_assessment: AIAssessment
    status: str = "completed"


class HealthResponse(BaseModel):
    status: str = "ok"
    ocr_engine_available: bool = True
    llm_available: bool = False
    version: str = "1.0.0"
