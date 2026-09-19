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
    AnalysisResult,
    NormalizedSession,
    Finding,
    FileInfo,
)
from backend.services.pcap.validator import (
    detect_tshark,
    validate_pcap_file,
    UnsupportedExtensionError,
    FileTooLargeError,
    CorruptPCAPError,
    EmptyPCAPError,
    TSharkUnavailableError,
)
from backend.services.pcap.parser import parse_pcap_with_tshark, TSharkParseError
from backend.services.pcap.session_reconstructor import reconstruct_sessions
from backend.services.rules.rule_engine import RuleEngine
from backend.services.scoring.risk_score import calculate_risk_score
from backend.services.ai.analyst import AIAnalyst
from backend.services.reports.json_report import generate_json_report
from backend.services.reports.pdf_report import generate_pdf_report
from backend.services.database.db import save_analysis, get_analysis
from backend.services.demo.dataset import generate_demo_analysis_result

router = APIRouter()

# In-memory status store for progress tracking
analysis_status_store: Dict[str, Dict[str, Any]] = {}

STAGES = [
    ("validate", "PCAP capture validated"),
    ("tshark_parse", "TShark packet extraction"),
    ("protocol_detect", "Email protocol identification"),
    ("session_reconstruct", "TCP stream session reconstruction"),
    ("crypto_analysis", "TLS, cert, and STARTTLS evidence extraction"),
    ("rules", "Deterministic security rule engine checks"),
    ("scoring", "Deterministic risk score calculation"),
    ("ai_assessment", "AI executive assessment generation"),
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
    tshark_info = detect_tshark()
    return HealthResponse(
        status="ok",
        tshark_available=tshark_info["available"],
        llm_available=bool(settings.LLM_API_KEY.strip()),
        version="1.0.0",
    )


def process_pcap_pipeline(analysis_id: str, filepath: str, file_name: str, file_size: int, data_source: str):
    try:
        now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        update_stage(analysis_id, "validate", "completed", "File validated")

        # 1. Packet parsing
        update_stage(analysis_id, "tshark_parse", "in_progress", "Extracting packets via TShark...")
        packets = parse_pcap_with_tshark(filepath)
        update_stage(analysis_id, "tshark_parse", "completed", f"{len(packets)} packets extracted")

        # 2. Protocol Identification & Session Reconstruction
        update_stage(analysis_id, "protocol_detect", "completed", "SMTP/IMAP/POP3 identified")
        update_stage(analysis_id, "session_reconstruct", "in_progress", "Reconstructing TCP streams...")
        sessions, protocol_stats = reconstruct_sessions(packets)
        update_stage(analysis_id, "session_reconstruct", "completed", f"{len(sessions)} sessions reconstructed")

        # 3. Crypto Evidence Extraction & Rules
        update_stage(analysis_id, "crypto_analysis", "completed", "Evidence extracted")
        update_stage(analysis_id, "rules", "in_progress", "Running security rules...")
        rule_engine = RuleEngine()
        findings = rule_engine.evaluate_all(sessions)
        update_stage(analysis_id, "rules", "completed", f"{len(findings)} verified findings")

        # 4. Risk Scoring
        update_stage(analysis_id, "scoring", "in_progress", "Calculating risk score...")
        score = calculate_risk_score(findings)
        update_stage(analysis_id, "scoring", "completed", f"Score: {score.score}/100 ({score.rating})")

        # 5. AI Assessment
        update_stage(analysis_id, "ai_assessment", "in_progress", "Generating executive summary...")
        analyst = AIAnalyst()
        ai_assessment = analyst.generate_assessment(score, findings)
        update_stage(analysis_id, "ai_assessment", "completed", "Assessment completed")

        result = AnalysisResult(
            analysis_id=analysis_id,
            created_at=now_str,
            data_source=data_source,
            file=FileInfo(name=file_name, size_bytes=file_size, content_type="application/vnd.tcpdump.pcap"),
            sessions=sessions,
            findings=findings,
            score=score,
            ai=ai_assessment,
            protocol_stats=protocol_stats,
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
    finally:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass


@router.post("/analyze")
@router.post("/analysis")
async def analyze_pcap(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in (".pcap", ".pcapng"):
        raise HTTPException(status_code=400, detail=f"Unsupported file extension '{ext}'. Must be .pcap or .pcapng")

    tshark_info = detect_tshark()
    if not tshark_info["available"]:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "stage": "pcap_parsing",
                "error_code": "TSHARK_NOT_FOUND",
                "message": tshark_info.get("error") or "TShark is not installed or could not be executed.",
            },
        )

    temp_dir = Path("/tmp") if os.getenv("VERCEL") else Path("scratch")
    temp_dir.mkdir(exist_ok=True)
    temp_path = temp_dir / f"upload_{uuid.uuid4().hex}{ext}"

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    with open(temp_path, "wb") as f:
        f.write(file_bytes)

    analysis_id = str(uuid.uuid4())
    init_status(analysis_id)

    background_tasks.add_task(
        process_pcap_pipeline,
        analysis_id,
        str(temp_path),
        file.filename,
        len(file_bytes),
        "file_upload",
    )

    return {"analysis_id": analysis_id}


@router.post("/demo")
def trigger_demo_analysis():
    analysis_id = str(uuid.uuid4())
    init_status(analysis_id)

    result = generate_demo_analysis_result()
    result.analysis_id = analysis_id
    save_analysis(result)

    if analysis_id in analysis_status_store:
        analysis_status_store[analysis_id]["status"] = "completed"
        for item in analysis_status_store[analysis_id]["progress"]:
            item.status = "completed"

    return {"analysis_id": analysis_id}


@router.get("/analyze/{analysis_id}/status")
@router.get("/analysis/{analysis_id}/status")
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


@router.get("/analyze/{analysis_id}")
@router.get("/analysis/{analysis_id}")
def get_analysis_result(analysis_id: str):
    res = get_analysis(analysis_id)
    if not res:
        raise HTTPException(status_code=404, detail="Analysis result not found")
    return res


@router.get("/analyze/{analysis_id}/sessions")
@router.get("/analysis/{analysis_id}/sessions")
def get_analysis_sessions(analysis_id: str):
    res = get_analysis(analysis_id)
    if not res:
        raise HTTPException(status_code=404, detail="Analysis result not found")
    return res.sessions


@router.get("/analyze/{analysis_id}/findings")
@router.get("/analysis/{analysis_id}/findings")
def get_analysis_findings(analysis_id: str, severity: Optional[str] = Query(default=None)):
    res = get_analysis(analysis_id)
    if not res:
        raise HTTPException(status_code=404, detail="Analysis result not found")
    if severity:
        sev_upper = severity.upper()
        return [f for f in res.findings if f.severity == sev_upper]
    return res.findings


@router.get("/analyze/{analysis_id}/report/{format}")
@router.get("/analysis/{analysis_id}/report/{format}")
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
            headers={"Content-Disposition": f"attachment; filename=SecureMailScope_Report_{analysis_id}.json"},
        )
    elif fmt == "pdf":
        pdf_bytes = generate_pdf_report(res)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=SecureMailScope_Report_{analysis_id}.pdf"},
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid report format. Use 'pdf' or 'json'.")
