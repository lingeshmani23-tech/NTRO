import os
import sys
from pathlib import Path

# Ensure root directory and backend directory are in sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

backend_dir = root_dir / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from backend.main import app

# Export both app and handler for Vercel Serverless Functions
handler = app

__all__ = ["app", "handler"]
