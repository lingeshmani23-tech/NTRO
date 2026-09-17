import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import router
from backend.services.database.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database on startup
    init_db()
    yield


app = FastAPI(
    title="SECUREMAILSCOPE",
    description="Passive Email Security Assessment API for SMTP, IMAP, and POP3",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS restricted strictly to http://localhost:5173 per C1 & §13
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def read_root():
    return {"message": "SECUREMAILSCOPE API Server active. Access /api/health for system status."}
