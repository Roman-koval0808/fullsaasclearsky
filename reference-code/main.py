"""
ClearSky AI Decision System
FastAPI Application Entry Point
================================
Run with:
    uvicorn clearsky.main:app --port 8000 --reload

Endpoints:
    POST /api/webhook/{provider}   Receive raw provider webhook
    GET  /api/events/{event_id}    Read Event Object and processing status
    GET  /api/events               List recent events (activity feed)
    GET  /api/pending-approvals    List items awaiting business owner approval
    GET  /api/blocked-actions      List blocked actions and reasons
    GET  /health                   Health check
    GET  /                         Serve cockpit HTML (when built)
    GET  /simulator                Serve simulator form HTML (when built)
"""

from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from typing import Any

import asyncpg
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from clearsky.database import init_db, get_pool
from clearsky.engine.runner import run_pipeline

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=getattr(logging, os.environ.get("LOG_LEVEL", "INFO")),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Database connection pool (shared across requests)
# ---------------------------------------------------------------------------

_pool: asyncpg.Pool | None = None


async def get_db() -> asyncpg.Connection:
    """Get a database connection from the pool."""
    global _pool
    if _pool is None:
        raise RuntimeError("Database pool not initialized.")
    return await _pool.acquire()


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database pool on startup, close on shutdown."""
    global _pool

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is required.")

    logger.info("Connecting to database...")
    _pool = await asyncpg.create_pool(database_url, min_size=2, max_size=10)
    logger.info("Database pool ready.")

    # Reset DB on startup if configured (development only)
    if os.environ.get("RESET_DB_ON_STARTUP", "false").lower() == "true":
        logger.warning("RESET_DB_ON_STARTUP is true. Resetting database.")
        async with _pool.acquire() as conn:
            await _reset_db(conn)

    yield

    logger.info("Closing database pool.")
    await _pool.close()


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="ClearSky AI Decision System",
    description="Event-driven automation layer for local business intelligence.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "clearsky-ai-decision-system"}


# ---------------------------------------------------------------------------
# Webhook endpoint — receives raw provider payloads
# ---------------------------------------------------------------------------

@app.post("/api/webhook/{provider}")
async def receive_webhook(provider: str, request: Request):
    """
    Receive a raw provider webhook payload.

    This is the entry point for all provider activity.
    The provider path parameter is used to pre-populate the
    'provider' field if not already present in the payload.

    The raw payload is passed directly to the pipeline runner
    which calls Sections 1 through 3 in sequence.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid JSON payload."
        )

    # Inject provider from URL path if not in payload
    if "provider" not in body:
        body["provider"] = provider

    logger.info(
        "Webhook received. provider=%s, event=%s",
        provider,
        body.get("event") or body.get("event_type") or "unknown"
    )

    async with _pool.acquire() as db:
        result = await run_pipeline(raw_payload=body, db=db)

    response = result.to_dict()

    # Return appropriate HTTP status based on pipeline result
    if result.pipeline_status == "error":
        return JSONResponse(status_code=500, content=response)

    return JSONResponse(status_code=200, content=response)


# ---------------------------------------------------------------------------
# Event endpoints
# ---------------------------------------------------------------------------

@app.get("/api/events")
async def list_events(limit: int = 20):
    """
    List recent events for the activity feed.
    Returns events ordered by created_at descending.
    """
    async with _pool.acquire() as db:
        rows = await db.fetch(
            """
            SELECT * FROM activity_feed
            LIMIT $1
            """,
            limit
        )
    return [_serialize_row(row) for row in rows]


@app.get("/api/events/{event_id}")
async def get_event(event_id: str):
    """
    Get a single Event Object with its full processing trace.
    """
    async with _pool.acquire() as db:
        event = await db.fetchrow(
            "SELECT * FROM events WHERE event_id = $1",
            event_id
        )
        if not event:
            raise HTTPException(status_code=404, detail="Event not found.")

        logs = await db.fetch(
            """
            SELECT status, message, logged_at
            FROM event_processing_logs
            WHERE event_id = $1
            ORDER BY logged_at ASC
            """,
            event_id
        )

        signals = await db.fetch(
            """
            SELECT signal_event_id, signal_name, signal_bucket,
                   priority, confidence_score, status, created_at
            FROM signal_events
            WHERE event_id = $1
            ORDER BY priority ASC
            """,
            event_id
        )

        decision = await db.fetchrow(
            """
            SELECT decision_id, dominant_signal_id, selected_action_ids,
                   blocked_action_ids, execution_mode, owner, reason, created_at
            FROM orchestrator_decisions
            WHERE event_id = $1
            ORDER BY created_at DESC
            LIMIT 1
            """,
            event_id
        )

    return {
        "event":    _serialize_row(event),
        "logs":     [_serialize_row(r) for r in logs],
        "signals":  [_serialize_row(r) for r in signals],
        "decision": _serialize_row(decision) if decision else None,
    }


# ---------------------------------------------------------------------------
# Approval endpoints
# ---------------------------------------------------------------------------

@app.get("/api/pending-approvals")
async def list_pending_approvals():
    """
    List all items waiting for business owner approval.
    Used by the cockpit approval panel.
    """
    async with _pool.acquire() as db:
        rows = await db.fetch("SELECT * FROM pending_approvals")
    return [_serialize_row(row) for row in rows]


@app.post("/api/executions/{execution_id}/approve")
async def approve_action(execution_id: str, request: Request):
    """
    Approve a pending action.
    Records approval and marks the execution ready for posting.

    Section 5 Execution will handle the actual A2P call when built.
    For now, records the approval state.
    """
    body = await request.json()
    edited_output = body.get("edited_output")

    async with _pool.acquire() as db:
        execution = await db.fetchrow(
            "SELECT * FROM executions WHERE execution_id = $1",
            execution_id
        )
        if not execution:
            raise HTTPException(
                status_code=404, detail="Execution not found."
            )
        if execution["approved_at"] is not None:
            raise HTTPException(
                status_code=400, detail="Already approved."
            )

        from datetime import datetime, timezone
        approved_at = datetime.now(timezone.utc)

        await db.execute(
            """
            UPDATE executions
            SET execution_status = 'approved',
                approved_at = $1,
                human_edited = $2,
                edited_output = $3,
                updated_at = $1
            WHERE execution_id = $4
            """,
            approved_at,
            edited_output is not None,
            json.dumps(edited_output) if edited_output else None,
            execution_id
        )

        await db.execute(
            """
            UPDATE action_queue
            SET status = 'approved', updated_at = $1
            WHERE action_queue_id = $2
            """,
            approved_at,
            execution["action_queue_id"]
        )

    return {
        "execution_id": execution_id,
        "status":       "approved",
        "human_edited": edited_output is not None,
        "approved_at":  approved_at.isoformat(),
    }


@app.post("/api/executions/{execution_id}/reject")
async def reject_action(execution_id: str, request: Request):
    """
    Reject a pending action.
    Records rejection and stops the action from proceeding.
    """
    body = await request.json()
    reason = body.get("reason", "Rejected by business owner.")

    async with _pool.acquire() as db:
        execution = await db.fetchrow(
            "SELECT * FROM executions WHERE execution_id = $1",
            execution_id
        )
        if not execution:
            raise HTTPException(
                status_code=404, detail="Execution not found."
            )

        from datetime import datetime, timezone
        rejected_at = datetime.now(timezone.utc)

        await db.execute(
            """
            UPDATE executions
            SET execution_status = 'rejected',
                rejected_at = $1,
                failure_reason = $2,
                updated_at = $1
            WHERE execution_id = $3
            """,
            rejected_at, reason, execution_id
        )

        await db.execute(
            """
            UPDATE action_queue
            SET status = 'rejected', updated_at = $1
            WHERE action_queue_id = $2
            """,
            rejected_at,
            execution["action_queue_id"]
        )

    return {
        "execution_id": execution_id,
        "status":       "rejected",
        "reason":       reason,
        "rejected_at":  rejected_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Blocked actions endpoint
# ---------------------------------------------------------------------------

@app.get("/api/blocked-actions")
async def list_blocked_actions():
    """
    List all actions the system blocked and why.
    Used by the blocked and auto-handled panel in the cockpit.
    """
    async with _pool.acquire() as db:
        rows = await db.fetch("SELECT * FROM blocked_actions_log")
    return [_serialize_row(row) for row in rows]


# ---------------------------------------------------------------------------
# Simulator endpoint — inject a scenario directly
# ---------------------------------------------------------------------------

@app.post("/api/simulate")
async def simulate_scenario(request: Request):
    """
    Accept a payload from the simulator form and run it through
    the pipeline. Equivalent to a real provider webhook but called
    from the simulator page rather than a real provider.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    provider = body.get("provider", "google_business_profile")
    logger.info("Simulator payload received. provider=%s", provider)

    async with _pool.acquire() as db:
        result = await run_pipeline(raw_payload=body, db=db)

    return JSONResponse(status_code=200, content=result.to_dict())


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _serialize_row(row) -> dict:
    """
    Convert an asyncpg Row to a JSON-serializable dict.
    Handles datetime, JSONB, and other non-serializable types.
    """
    if row is None:
        return {}
    result = {}
    for key in row.keys():
        value = row[key]
        if hasattr(value, "isoformat"):
            result[key] = value.isoformat()
        elif isinstance(value, (dict, list)):
            result[key] = value
        else:
            result[key] = value
    return result


async def _reset_db(conn: asyncpg.Connection) -> None:
    """
    Drop and recreate all tables. Development only.
    NEVER use in production.
    """
    tables = [
        "feedback", "outcomes", "executions", "action_queue",
        "orchestrator_decisions", "signal_events",
        "event_processing_logs", "events", "raw_inputs",
        "client_orchestrator_profiles", "safety_compliance_rules",
        "signal_action_mappings", "orchestrator_rules",
        "signal_rules", "action_library",
        "provider_event_registry", "business_configurations",
        "network_categories", "schema_migrations",
    ]
    for table in tables:
        await conn.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
    logger.warning("All tables dropped. Run migrations to recreate.")
