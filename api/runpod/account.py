# app/api/account.py

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException

# Load environment variables (both .env and .env.local if present)
load_dotenv(dotenv_path=Path.cwd() / ".env")
load_dotenv(dotenv_path=Path.cwd() / ".env.local")

# If your client module is a sibling of this file in a package, keep the relative import.
# Adjust as needed for your project structure.
from .client import (
    fetchAccountInfo,
    fetchPods,
    fetchPodById,
)

from pydantic import BaseModel, Field


router = APIRouter(prefix="/account", tags=["account"])


# ---------- Response Models ----------

class AccountSummary(BaseModel):
    account: Optional[Dict[str, Any]]
    pods: List[Dict[str, Any]]
    totalCost: float = Field(..., description="Accumulated cost of currently running pods")
    activePods: int = Field(..., description="Number of pods with status == 'RUNNING'")
    error: Optional[str] = None


# ---------- Service Functions (module API) ----------

async def get_account_summary() -> AccountSummary:
    """
    Mirrors the TS getAccountSummary() behavior using asyncio.gather for concurrency.
    Assumes client helpers return dicts like: { 'success': bool, 'data': ..., 'error': str | None }.
    """
    try:
        account_result, pods_result = await asyncio.gather(
            fetchAccountInfo(),
            fetchPods(),
        )

        account: Optional[Dict[str, Any]] = account_result["data"] if account_result.get("success") else None
        pods: List[Dict[str, Any]] = pods_result["data"] if pods_result.get("success") else []

        # Count running pods
        active_pods = sum(1 for p in pods if p.get("status") == "RUNNING")

        # Compute total cost for running pods: costPerHr * (uptimeSeconds / 3600)
        total_cost = 0.0
        for p in pods:
            if p.get("status") == "RUNNING":
                uptime_seconds = float(p.get("uptimeSeconds", 0) or 0)
                cost_per_hr = float(p.get("costPerHr", 0) or 0)
                total_cost += cost_per_hr * (uptime_seconds / 3600.0)

        error_msg: Optional[str] = None
        if not (account_result.get("success") and pods_result.get("success")):
            error_msg = f"Account: {account_result.get('error') or 'OK'}, Pods: {pods_result.get('error') or 'OK'}"

        return AccountSummary(
            account=account,
            pods=pods,
            totalCost=total_cost,
            activePods=active_pods,
            error=error_msg,
        )
    except Exception as exc:  # broad catch mirrors the TS fallback
        return AccountSummary(
            account=None,
            pods=[],
            totalCost=0.0,
            activePods=0,
            error=str(exc) if isinstance(exc, Exception) else "Unknown error",
        )


async def get_account_info() -> Optional[Dict[str, Any]]:
    result = await fetchAccountInfo()
    return result["data"] if result.get("success") else None


async def get_active_pods() -> List[Dict[str, Any]]:
    result = await fetchPods()
    if not result.get("success"):
        return []
    pods: List[Dict[str, Any]] = result.get("data") or []
    return [p for p in pods if p.get("status") == "RUNNING"]


async def get_pod_by_id(pod_id: str) -> Optional[Dict[str, Any]]:
    result = await fetchPodById(pod_id)
    return result["data"] if result.get("success") else None


# ---------- HTTP Endpoints (optional but handy) ----------

@router.get("/summary", response_model=AccountSummary)
async def http_get_account_summary() -> AccountSummary:
    return await get_account_summary()


@router.get("", response_model=Optional[Dict[str, Any]])
async def http_get_account_info() -> Optional[Dict[str, Any]]:
    return await get_account_info()


@router.get("/pods/active", response_model=List[Dict[str, Any]])
async def http_get_active_pods() -> List[Dict[str, Any]]:
    return await get_active_pods()


@router.get("/pods/{pod_id}", response_model=Optional[Dict[str, Any]])
async def http_get_pod_by_id(pod_id: str) -> Optional[Dict[str, Any]]:
    pod = await get_pod_by_id(pod_id)
    if pod is None:
        # Optional: raise a 404 instead of returning None
        raise HTTPException(status_code=404, detail="Pod not found")
    return pod