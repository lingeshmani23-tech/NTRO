import os
import uuid
import time
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Query, Response
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.models.schemas import (
    HealthResponse,
    StatusResponse,
    StageProgress,
    ComplianceResult,
    ExtractedPackageData,
    ComplianceCheck,
    FileInfo,
)
from backend.services.ocr.ocr_engine import extract_package_label, detect_ocr_availability
from backend.services.rules.metrology_rules import MetrologyRuleEngine
from backend.services.scoring.compliance_score import calculate_compliance_score
from backend.services.ai.analyst import AIAnalyst
from backend.services.reports.json_report import generate_json_report
from backend.services.reports.pdf_report import generate_pdf_report
from backend.services.database.db import save_analysis, get_analysis

router = APIRouter(prefix="/api")

# In-memory status store for progress tracking
analysis_status_store: Dict[str, Dict[str, Any]] = {}

STAGES = [
    ("upload", "Package label image received"),
    ("ocr_extract", "OCR Label declaration extraction"),
    ("rule_check", "Legal Metrology Rule 6 checks"),
    ("scoring", "Compliance score calculation"),
    ("ai_assessment", "Executive assessment generation"),
]


def init_status(analysis_id: str) -> Dict[str, Any]:
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    progress = [
        StageProgress(stage=s[0], status="pending", detail=s[1], updated_at=now)
        for s in STAGES
    ]
    status_entry = {
        "analysis_id": analysis_id,
        "status": "processing",
        "progress": progress,
    }
    analysis_status_store[analysis_id] = status_entry
    return status_entry


def update_stage(analysis_id: str, stage_id: str, stage_status: str, detail: Optional[str] = None):
    if analysis_id not in analysis_status_store:
        return
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    for item in analysis_status_store[analysis_id]["progress"]:
        if item.stage == stage_id:
            item.status = stage_status
            if detail:
                item.detail = detail
            item.updated_at = now
            break


@router.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        ocr_engine_available=detect_ocr_availability(),
        llm_available=bool(settings.LLM_API_KEY.strip()),
        version="1.0.0",
    )


def process_analysis_pipeline(analysis_id: str, file_bytes: bytes, file_name: str, content_type: str, data_source: str):
    try:
        now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        update_stage(analysis_id, "upload", "completed", "Image received")

        # 1. OCR Extraction
        update_stage(analysis_id, "ocr_extract", "in_progress", "Extracting label declarations...")
        extracted_data = extract_package_label(file_bytes, file_name)
        update_stage(analysis_id, "ocr_extract", "completed", "6 declarations extracted")

        # 2. Rule Checks
        update_stage(analysis_id, "rule_check", "in_progress", "Running Legal Metrology checks...")
        engine = MetrologyRuleEngine()
        checks = engine.evaluate(extracted_data)
        update_stage(analysis_id, "rule_check", "completed", f"{len(checks)} rules evaluated")

        # 3. Compliance Scoring
        update_stage(analysis_id, "scoring", "in_progress", "Calculating compliance score...")
        score = calculate_compliance_score(checks)
        update_stage(analysis_id, "scoring", "completed", f"Score: {score.score}/100 ({score.rating})")

        # 4. AI Executive Assessment
        update_stage(analysis_id, "ai_assessment", "in_progress", "Generating executive summary...")
        analyst = AIAnalyst()
        ai_assessment = analyst.generate_assessment(score, checks)
        update_stage(analysis_id, "ai_assessment", "completed", "Assessment completed")

        result = ComplianceResult(
            analysis_id=analysis_id,
            created_at=now_str,
            data_source=data_source,
            file=FileInfo(
                name=file_name,
                size_bytes=len(file_bytes),
                content_type=content_type,
            ),
            extracted_data=extracted_data,
            checks=checks,
            score=score,
            ai_assessment=ai_assessment,
            status="completed",
        )

        save_analysis(result)
        if analysis_id in analysis_status_store:
            analysis_status_store[analysis_id]["status"] = "completed"

    except Exception as e:
        if analysis_id in analysis_status_store:
            analysis_status_store[analysis_id]["status"] = "failed"
            for item in analysis_status_store[analysis_id]["progress"]:
                if item.status == "in_progress":
                    item.status = "failed"
                    item.detail = f"Failed: {str(e)}"


@router.post("/analyze")
async def analyze_package(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    analysis_id = str(uuid.uuid4())
    init_status(analysis_id)

    background_tasks.add_task(
        process_analysis_pipeline,
        analysis_id,
        file_bytes,
        file.filename,
        file.content_type or "image/png",
        "file_upload",
    )

    return {"analysis_id": analysis_id}


@router.post("/demo")
def trigger_demo_analysis(sample_type: str = Query(default="compliant")):
    analysis_id = str(uuid.uuid4())
    init_status(analysis_id)

    file_name = "organic_wheat_atta_pack.png"
    if sample_type == "non_compliant":
        file_name = "defect_ceylon_tea_label.png"
    elif sample_type == "critical":
        file_name = "critical_unbranded_soap.png"

    dummy_bytes = b"DEMO_LABEL_BYTES"
    process_analysis_pipeline(
        analysis_id,
        dummy_bytes,
        file_name,
        "image/png",
        "demo_dataset",
    )

    return {"analysis_id": analysis_id}


@router.get("/analyze/{analysis_id}/status", response_model=StatusResponse)
def get_analysis_status(analysis_id: str):
    if analysis_id in analysis_status_store:
        entry = analysis_status_store[analysis_id]
        return StatusResponse(
            analysis_id=analysis_id,
            status=entry["status"],
            progress=entry["progress"],
        )

    res = get_analysis(analysis_id)
    if res:
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        progress = [
            StageProgress(stage=s[0], status="completed", detail=s[1], updated_at=now)
            for s in STAGES
        ]
        return StatusResponse(
            analysis_id=analysis_id,
            status="completed",
            progress=progress,
        )

    raise HTTPException(status_code=404, detail="Analysis ID not found")


@router.get("/analyze/{analysis_id}", response_model=ComplianceResult)
def get_analysis_result(analysis_id: str):
    res = get_analysis(analysis_id)
    if not res:
        raise HTTPException(status_code=404, detail="Analysis result not found")
    return res


@router.get("/analyze/{analysis_id}/declarations", response_model=ExtractedPackageData)
def get_analysis_declarations(analysis_id: str):
    res = get_analysis(analysis_id)
    if not res:
        raise HTTPException(status_code=404, detail="Analysis result not found")
    return res.extracted_data


@router.get("/analyze/{analysis_id}/checks", response_model=List[ComplianceCheck])
def get_analysis_checks(analysis_id: str):
    res = get_analysis(analysis_id)
    if not res:
        raise HTTPException(status_code=404, detail="Analysis result not found")
    return res.checks


@router.get("/analyze/{analysis_id}/report/{format}")
def download_report(analysis_id: str, format: str):
    res = get_analysis(analysis_id)
    if not res:
        raise HTTPException(status_code=404, detail="Analysis result not found")

    fmt = format.lower()
    if fmt == "json":
        content = generate_json_report(res)
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=Legal_Metrology_Report_{analysis_id}.json"},
        )
    elif fmt == "pdf":
        pdf_bytes = generate_pdf_report(res)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=Legal_Metrology_Report_{analysis_id}.pdf"},
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid report format. Use 'pdf' or 'json'.")
