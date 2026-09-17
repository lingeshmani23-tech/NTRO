$ErrorActionPreference = "Stop"
Write-Host "Running SECUREMAILSCOPE API Smoke Suite..."
py -m pytest tests/test_errors.py
py scripts/smoke_api.py
Write-Host "API Smoke Suite passed!"
