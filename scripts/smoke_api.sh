#!/usr/bin/env bash
set -e

echo "Running SECUREMAILSCOPE API Smoke Suite..."
py -m pytest tests/test_errors.py
py scripts/smoke_api.py
echo "API Smoke Suite passed!"
