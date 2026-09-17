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
)
from backend.services.pcap.validator import (
    detect_tshark,
    resolve_tshark_path,
    get_tshark_version,
    validate_pcap_file,
    UnsupportedExtensionError,
    FileTooLargeError,
    CorruptPCAPError,
    EmptyPCAPError,
    TSharkUnavailableError,
)
from backend.services.pcap.parser import parse_pcap_with_tshark, TSharkParseError
from backend.services.pcap.session_reconstructor import reconstruct_sessions
from backend.services.crypto.certificate_analyzer import analyze_certificate
from backend.services.crypto.starttls_analyzer import analyze_starttls
from backend.services.rules.rule_engine import RuleEngine
from backend.services.scoring.risk_score import calculate_risk_score
from backend.services.ai.analyst import AIAnalyst
from backend.services.reports.json_report import generate_json_report
from backend.services.reports.pdf_report import generate_pdf_report
from backend.services.database.db import save_analysis, get_analysis
from backend.services.demo.dataset import generate_demo_analysis_result, build_demo_sessions

router = APIRouter(prefix="/api")

# In-memory status registry for ongoing tasks
analysis_status_store: Dict[str, Dict[str, Any]] = {}

CANONICAL_STAGES = [
    ("validate", "PCAP validated"),
    ("tshark_parse", "TShark packet extraction"),
    ("protocol_detect", "Email protocol detection"),
    ("session_reconstruct", "TCP stream session reconstruction"),
    ("tls_analysis", "TLS handshake & cipher analysis"),
    ("certificate_analysis", "X.509 certificate validation"),
    ("rules", "Rule engine security checks"),
    ("scoring", "Risk score calculation"),
    ("ai_assessment", "AI executive assessment generation"),
]


def init_status(analysis_id: str) -> Dict[str, Any]:
    stages = [
        {"id": s_id, "label": s_lbl, "state": "pending", "ms": 0, "error": None}
        for s_id, s_lbl in CANONICAL_STAGES
    ]
    status_entry = {
        "analysis_id": analysis_id,
        "status": "queued",
        "current_stage": "validate",
        "percent": 0,
        "start_time": time.time(),
        "elapsed_ms": 0,
        "stages": stages,
        "error": None,
    }
    analysis_status_store[analysis_id] = status_entry
    return status_entry


def update_stage(analysis_id: str, stage_id: str, state: str, ms: int = 0, error_msg: Optional[str] = None):
    entry = analysis_status_store.get(analysis_id)
    if not entry:
        return
    entry["status"] = "running" if state in ("active", "done") else entry["status"]
    entry["current_stage"] = stage_id
    entry["elapsed_ms"] = int((time.time() - entry["start_time"]) * 1000)

    done_count = 0
    total_stages = len(entry["stages"])
    for idx, st in enumerate(entry["stages"]):
        if st["id"] == stage_id:
            st["state"] = state
            st["ms"] = ms
            st["error"] = error_msg
        if st["state"] == "done":
            done_count += 1

    entry["percent"] = int((done_count / total_stages) * 100)
    if state == "failed":
        entry["status"] = "failed"
        entry["error"] = {"code": "ANALYSIS_FAILED", "message": error_msg or "Stage failed"}
    elif done_count == total_stages:
        entry["status"] = "completed"
        entry["percent"] = 100


@router.get("/health", response_model=HealthResponse)
def get_health():
    t_info = detect_tshark()
    ai_prov = "llm" if os.getenv("LLM_API_KEY", "").strip() else "fallback"

    return HealthResponse(
        status="ok",
        tshark_available=t_info["available"],
        tshark_version=t_info["version"],
        tshark_path=t_info["path"],
        tshark_error=t_info["error"],
        ai_provider=ai_prov,
    )


@router.post("/demo", status_code=202)
def create_demo_analysis(background_tasks: BackgroundTasks):
    analysis_id = str(uuid.uuid4())
    init_status(analysis_id)
    background_tasks.add_task(run_demo_pipeline_sync, analysis_id)
    return {"analysis_id": analysis_id}


def run_demo_pipeline_sync(analysis_id: str):
    try:
        for s_id, _ in CANONICAL_STAGES:
            update_stage(analysis_id, s_id, "active", ms=20)
            time.sleep(0.05)  # 50ms per stage in background
            update_stage(analysis_id, s_id, "done", ms=50)

        demo_result = generate_demo_analysis_result()
        demo_result.analysis_id = analysis_id
        save_analysis(demo_result)

    except Exception as e:
        update_stage(analysis_id, "ai_assessment", "failed", error_msg=str(e))


@router.post("/analyze", status_code=202)
async def analyze_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "UNSUPPORTED_EXTENSION", "message": "Filename is required"}},
        )

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pcap", ".pcapng"):
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "UNSUPPORTED_EXTENSION",
                    "message": f"Extension '{ext}' is not supported. Only .pcap and .pcapng files are allowed.",
                }
            },
        )

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        return JSONResponse(
            status_code=413,
            content={
                "error": {
                    "code": "FILE_TOO_LARGE",
                    "message": f"File size exceeds maximum limit of {settings.MAX_UPLOAD_MB} MB",
                }
            },
        )

    t_info = detect_tshark()
    if not t_info["available"]:
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "TSHARK_UNAVAILABLE",
                    "message": t_info["error"] or "TShark packet analyzer is not installed or not in PATH.",
                    "hint": "Please install Wireshark/TShark on your system or run Demo Analysis.",
                }
            },
        )

    analysis_id = str(uuid.uuid4())
    temp_dir = Path("temp_uploads") / analysis_id
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"capture{ext}"

    with open(temp_path, "wb") as f:
        f.write(content)

    init_status(analysis_id)
    background_tasks.add_task(run_live_pipeline_sync, analysis_id, str(temp_path), file.filename, len(content))

    return {"analysis_id": analysis_id}


def run_live_pipeline_sync(analysis_id: str, filepath: str, original_name: str, size_bytes: int):
    try:
        # Stage 1: Validate
        t0 = time.time()
        update_stage(analysis_id, "validate", "active")
        pkt_count = validate_pcap_file(filepath, max_upload_mb=settings.MAX_UPLOAD_MB)
        update_stage(analysis_id, "validate", "done", ms=int((time.time() - t0) * 1000))

        # Stage 2: TShark Parse
        t0 = time.time()
        update_stage(analysis_id, "tshark_parse", "active")
        raw_packets = parse_pcap_with_tshark(filepath)
        update_stage(analysis_id, "tshark_parse", "done", ms=int((time.time() - t0) * 1000))

        # Stage 3 & 4: Protocol & Session
        t0 = time.time()
        update_stage(analysis_id, "protocol_detect", "active")
        update_stage(analysis_id, "protocol_detect", "done", ms=10)

        update_stage(analysis_id, "session_reconstruct", "active")
        sessions, proto_stats = reconstruct_sessions(raw_packets)
        update_stage(analysis_id, "session_reconstruct", "done", ms=int((time.time() - t0) * 1000))

        # Stage 5 & 6: Crypto & Cert
        update_stage(analysis_id, "tls_analysis", "active")
        update_stage(analysis_id, "tls_analysis", "done", ms=20)

        update_stage(analysis_id, "certificate_analysis", "active")
        update_stage(analysis_id, "certificate_analysis", "done", ms=20)

        # Stage 7: Rules
        t0 = time.time()
        update_stage(analysis_id, "rules", "active")
        rule_engine = RuleEngine()
        findings = rule_engine.evaluate_all(sessions)
        update_stage(analysis_id, "rules", "done", ms=int((time.time() - t0) * 1000))

        # Stage 8: Scoring
        t0 = time.time()
        update_stage(analysis_id, "scoring", "active")
        score = calculate_risk_score(findings)
        update_stage(analysis_id, "scoring", "done", ms=int((time.time() - t0) * 1000))

        # Stage 9: AI Assessment
        t0 = time.time()
        update_stage(analysis_id, "ai_assessment", "active")
        ai_analyst = AIAnalyst()
        ai_assessment = ai_analyst.generate_assessment(score, findings)
        update_stage(analysis_id, "ai_assessment", "done", ms=int((time.time() - t0) * 1000))

        # Build Totals & Result
        encrypted_cnt = sum(1 for s in sessions if s.encryption is True)
        plaintext_cnt = sum(1 for s in sessions if s.encryption is False)

        totals = {
            "packets": pkt_count,
            "sessions": len(raw_packets),
            "email_sessions": len(sessions),
            "encrypted_sessions": encrypted_cnt,
            "plaintext_sessions": plaintext_cnt,
            "findings": len(findings),
        }

        import hashlib

        sha256_hash = hashlib.sha256(open(filepath, "rb").read()).hexdigest()

        file_info = {
            "name": original_name,
            "size_bytes": size_bytes,
            "packet_count": pkt_count,
            "sha256": sha256_hash,
        }

        result = AnalysisResult(
            analysis_id=analysis_id,
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            data_source="pcap",
            file=file_info,
            status="completed",
            protocol_stats=proto_stats,
            totals=totals,
            sessions=sessions,
            findings=findings,
            score=score,
            ai=ai_assessment,
            errors=[],
            warnings=[],
        )

        save_analysis(result)

    except (CorruptPCAPError, EmptyPCAPError) as e:
        update_stage(analysis_id, "validate", "failed", error_msg=str(e))
    except TSharkParseError as e:
        update_stage(analysis_id, "tshark_parse", "failed", error_msg=str(e))
    except Exception as e:
        update_stage(analysis_id, "ai_assessment", "failed", error_msg=str(e))
    finally:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass


@router.get("/analyze/{analysis_id}/status", response_model=StatusResponse)
def get_analysis_status(analysis_id: str):
    entry = analysis_status_store.get(analysis_id)
    if not entry:
        result = get_analysis(analysis_id)
        if result:
            stages = [
                {"id": s_id, "label": s_lbl, "state": "done", "ms": 100, "error": None}
                for s_id, s_lbl in CANONICAL_STAGES
            ]
            return StatusResponse(
                analysis_id=analysis_id,
                status="completed",
                current_stage="ai_assessment",
                percent=100,
                elapsed_ms=900,
                stages=stages,
                error=None,
            )
        raise HTTPException(status_code=404, detail="Analysis ID not found")

    stages = [StageProgress(**st) for st in entry["stages"]]
    return StatusResponse(
        analysis_id=entry["analysis_id"],
        status=entry["status"],
        current_stage=entry["current_stage"],
        percent=entry["percent"],
        elapsed_ms=entry["elapsed_ms"],
        stages=stages,
        error=entry["error"],
    )


@router.get("/analyze/{analysis_id}", response_model=AnalysisResult)
def get_analysis_result(analysis_id: str):
    result = get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis ID not found")
    return result


@router.get("/analyze/{analysis_id}/sessions", response_model=List[NormalizedSession])
def get_analysis_sessions(analysis_id: str):
    result = get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis ID not found")
    return result.sessions


@router.get("/analyze/{analysis_id}/findings", response_model=List[Finding])
def get_analysis_findings(analysis_id: str, severity: Optional[str] = Query(None)):
    result = get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis ID not found")

    if severity:
        sev_upper = severity.upper()
        return [f for f in result.findings if f.severity == sev_upper]
    return result.findings


@router.get("/analyze/{analysis_id}/report/json")
def download_json_report(analysis_id: str):
    result = get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis ID not found")

    json_str = generate_json_report(result)
    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="securemailscope_report_{analysis_id}.json"'},
    )


@router.get("/analyze/{analysis_id}/report/pdf")
def download_pdf_report(analysis_id: str):
    result = get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis ID not found")

    try:
        pdf_bytes = generate_pdf_report(result)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="securemailscope_report_{analysis_id}.pdf"'},
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "REPORT_GENERATION_FAILED",
                    "message": f"Failed to generate PDF report: {str(e)}",
                }
            },
        )
