import json
import sqlite3
import os
from typing import Optional, List
from backend.config import settings
from backend.models.schemas import AnalysisResult


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                data_source TEXT NOT NULL,
                file_name TEXT NOT NULL,
                score INTEGER NOT NULL,
                rating TEXT NOT NULL,
                status TEXT NOT NULL,
                result_json TEXT NOT NULL
            );
            """
        )
        conn.commit()


def save_analysis(result: AnalysisResult):
    init_db()
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO analyses
            (id, created_at, data_source, file_name, score, rating, status, result_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                result.analysis_id,
                result.created_at,
                result.data_source,
                result.file.name,
                result.score.score,
                result.score.rating,
                result.status,
                json.dumps(result.model_dump(), default=str),
            ),
        )
        conn.commit()


def get_analysis(analysis_id: str) -> Optional[AnalysisResult]:
    init_db()
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT result_json FROM analyses WHERE id = ?", (analysis_id,)
        ).fetchone()
        if row:
            data = json.loads(row["result_json"])
            return AnalysisResult(**data)
    return None
