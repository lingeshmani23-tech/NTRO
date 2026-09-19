import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure root directory and backend directory are in sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from backend.api.routes import router
from backend.services.database.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database on startup safely
    try:
        init_db()
    except Exception as e:
        print(f"Startup notice: SQLite DB init warning: {e}")
    yield


app = FastAPI(
    title="SECUREMAILSCOPE",
    description="Passive Email Security Assessment API for SMTP, IMAP, and POP3",
    version="1.0.0",
    lifespan=lifespan,
)


# Exception Handlers to guarantee structured JSON error contract
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "stage": "api",
            "error_code": f"HTTP_{exc.status_code}",
            "message": str(exc.detail),
            "detail": str(exc.detail),
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={
            "status": "error",
            "stage": "validation",
            "error_code": "INVALID_REQUEST",
            "message": "Invalid request body or parameter schema.",
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "stage": "server",
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": f"Backend internal error: {str(exc)}",
        },
    )


# CORS configured for local dev and Vercel deployment domains
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    allowed_origins.extend([o.strip() for o in env_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router under /api prefix and also root prefix
app.include_router(router, prefix="/api")
app.include_router(router)


@app.get("/")
def read_root():
    return {"message": "SECUREMAILSCOPE API Server active. Access /api/health or /health for system status."}
