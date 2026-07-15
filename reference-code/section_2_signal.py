"""
ClearSky AI Decision System
Section 2: Signal Detection
===========================
Evaluates a handoff-eligible Event against configured Signal rules to
determine whether the Event has business meaning.

The Event says what happened.
The Signal asks whether what happened matters.

Processing steps:
    1.  Confirm Event is handoff_eligible
    2.  Load Event Object from database
    3.  Load business configuration
    4.  Build event_data dict for condition evaluation
    5.  Query active Signal rules for this event_type
    6.  Evaluate each rule's conditions using the condition evaluator
    7.  Validate required fields for matching rules
    8.  Check cooldown periods
    9.  Create Signal candidates for rules that pass
    10. Return all Signal candidates to the runner

Boundary:
    This section stops at the Signal candidate boundary.
    It does not make Orchestrator decisions, select Actions,
    queue work, execute anything, or record Outcomes.

    Signal candidates are passed to Section 3 Orchestrator Decision.
    The Orchestrator selects the dominant Signal and determines what
    should happen next.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

import asyncpg

from clearsky.engine.condition_evaluator import (
    evaluate_conditions,
    build_event_data,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def detect_signals(
    event_id: str,
    db: asyncpg.Connection,
) -> SignalDetectionResult:
    """
    Run Signal Detection for a handoff-eligible Event.

    Args:
        event_id:   The event_id of a handoff-eligible Event.
        db:         Active database connection.

    Returns:
        SignalDetectionResult with all Signal candidates and evaluation log.
    """
    log = SignalLog(event_id=event_id)
    log.step("signal_detection_started",
             f"Signal Detection started for event_id={event_id}")

    # ------------------------------------------------------------------
    # Step 1: Confirm handoff eligibility
    # ------------------------------------------------------------------
    event = await _load_event(db, event_id)
    if not event:
        log.step("event_not_found", f"No event found for event_id={event_id}")
        return SignalDetectionResult(
            event_id=event_id,
            signal_candidates=[],
            no_signal_reason="event_not_found",
            log=log,
        )

    if not event["handoff_eligible"]:
        log.step("event_not_handoff_eligible",
                 f"Event processing_status={event['processing_status']}. "
                 f"Not eligible for Signal Detection.")
        return SignalDetectionResult(
            event_id=event_id,
            signal_candidates=[],
            no_signal_reason="event_not_handoff_eligible",
            log=log,
        )

    event_type       = event["event_type"]
    network_category = event["network_category"]
    business_id      = event["business_id"]

    log.step("event_confirmed",
             f"Event confirmed: event_type={event_type}, "
             f"network_category={network_category}, "
             f"business_id={business_id}")

    # ------------------------------------------------------------------
    # Step 2 & 3: Load business configuration
    # ------------------------------------------------------------------
    business_config = await _load_business_config(db, business_id)
    if not business_config:
        log.step("business_config_not_found",
                 f"No business configuration for business_id={business_id}. "
                 f"Using defaults.")
        business_config = {}
    else:
        log.step("business_config_loaded",
                 f"Business config loaded for {business_config.get('business_name')}")

    # ------------------------------------------------------------------
    # Step 4: Build event_data dict for condition evaluation
    # ------------------------------------------------------------------
    event_data = build_event_data(dict(event), dict(business_config))
    log.step("event_data_built",
             "Event data assembled for condition evaluation.")

    # ------------------------------------------------------------------
    # Step 5: Query active Signal rules for this event_type
    # ------------------------------------------------------------------
    signal_rules = await _load_signal_rules(db, event_type)
    if not signal_rules:
        log.step("no_signal_rules_found",
                 f"No active Signal rules for event_type={event_type}. "
                 f"No Signal fires.")
        return SignalDetectionResult(
            event_id=event_id,
            signal_candidates=[],
            no_signal_reason="no_rules_configured_for_event_type",
            log=log,
        )

    log.step("signal_rules_loaded",
             f"{len(signal_rules)} active Signal rule(s) found for "
             f"event_type={event_type}")

    # ------------------------------------------------------------------
    # Steps 6-9: Evaluate each rule
    # ------------------------------------------------------------------
    candidates = []
    evaluations = []

    for rule in signal_rules:
        rule_id     = rule["signal_rule_id"]
        signal_name = rule["signal_name"]
        conditions  = json.loads(rule["conditions"] or "[]")
        req_fields  = json.loads(rule["required_fields"] or "[]")
        cooldown_h  = rule["cooldown_hours"] or 0
        priority    = rule["default_priority"]
        bucket      = rule["signal_bucket"]

        eval_record = {
            "signal_rule_id": rule_id,
            "signal_name":    signal_name,
            "passed":         False,
            "reason":         None,
        }

        # Step 6: Evaluate conditions
        result = evaluate_conditions(conditions, event_data)

        if not result.passed:
            eval_record["reason"] = (
                f"Conditions not met. "
                f"Failed on: {[c.get('field') for c in result.failed_on]}"
            )
            if result.has_errors:
                eval_record["reason"] += f" Errors: {result.errors}"
            evaluations.append(eval_record)
            log.step(f"rule_{rule_id}_no_match", eval_record["reason"])
            continue

        # Step 7: Validate required fields
        missing = _check_required_fields(req_fields, event_data)
        if missing:
            eval_record["reason"] = (
                f"Required fields missing: {missing}"
            )
            evaluations.append(eval_record)
            log.step(f"rule_{rule_id}_missing_fields", eval_record["reason"])
            continue

        # Step 8: Check cooldown
        if cooldown_h > 0:
            in_cooldown = await _check_cooldown(
                db, rule_id, business_id, cooldown_h
            )
            if in_cooldown:
                eval_record["reason"] = (
                    f"Signal in cooldown period ({cooldown_h}h). "
                    f"Not firing."
                )
                evaluations.append(eval_record)
                log.step(f"rule_{rule_id}_cooldown_active",
                         eval_record["reason"])
                continue

        # Step 9: Create Signal candidate
        confidence_score = _extract_confidence(event_data)
        ai_fields_used   = _identify_ai_fields_used(conditions, event_data)

        # Extract business management context from event_data
        # This is carried forward as context — Signal Detection does not
        # use it to decide whether the Signal is valid.
        business_mgmt_context = _extract_business_mgmt_context(event_data)

        signal_event_id = _generate_signal_event_id()
        candidate = SignalCandidate(
            signal_event_id          = signal_event_id,
            event_id                 = event_id,
            signal_rule_id           = rule_id,
            signal_name              = signal_name,
            signal_bucket            = bucket,
            priority                 = priority,
            confidence_score         = confidence_score,
            conditions_met           = conditions,
            ai_fields_used           = ai_fields_used,
            business_mgmt_context    = business_mgmt_context,
        )

        # Store Signal candidate in database
        await _store_signal_candidate(db, candidate)

        candidates.append(candidate)
        eval_record["passed"] = True
        eval_record["reason"] = "All conditions met. Signal candidate created."
        eval_record["signal_event_id"] = signal_event_id
        evaluations.append(eval_record)

        log.step(
            f"rule_{rule_id}_signal_fired",
            f"Signal candidate created: {signal_name} "
            f"(bucket={bucket}, priority={priority}, "
            f"confidence={confidence_score})"
        )

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    if not candidates:
        log.step("no_signals_fired",
                 f"No Signal rules matched for event_id={event_id}. "
                 f"Evaluation logged. No Signal created.")
        return SignalDetectionResult(
            event_id=event_id,
            signal_candidates=[],
            no_signal_reason="no_rules_matched",
            evaluations=evaluations,
            log=log,
        )

    log.step(
        "signal_detection_complete",
        f"{len(candidates)} Signal candidate(s) created: "
        f"{[c.signal_name for c in candidates]}. "
        f"Passing to Orchestrator."
    )

    return SignalDetectionResult(
        event_id=event_id,
        signal_candidates=candidates,
        no_signal_reason=None,
        evaluations=evaluations,
        log=log,
    )


# ---------------------------------------------------------------------------
# Database loaders
# ---------------------------------------------------------------------------

async def _load_event(
    db: asyncpg.Connection,
    event_id: str,
) -> dict | None:
    """Load the full Event Object from the database."""
    row = await db.fetchrow(
        """
        SELECT
            event_id, event_type, network_category, business_id,
            provider, provider_event_name,
            rating, review_text, reviewer_name,
            rating_content_mismatch,
            handoff_eligible, processing_status,
            requires_ai_extraction, ai_extraction_completed,
            ai_context, ai_confidence_score, ai_context_quality,
            business_matched, customer_matched, lead_matched,
            is_duplicate, occurred_at, received_at, created_at,
            normalized_payload
        FROM events
        WHERE event_id = $1
        """,
        event_id
    )
    if not row:
        return None

    event = dict(row)

    # Parse ai_context from JSON string if needed
    if event.get("ai_context") and isinstance(event["ai_context"], str):
        try:
            event["ai_context"] = json.loads(event["ai_context"])
        except json.JSONDecodeError:
            event["ai_context"] = {}

    # Parse normalized_payload
    if event.get("normalized_payload") and isinstance(
        event["normalized_payload"], str
    ):
        try:
            normalized = json.loads(event["normalized_payload"])
            # Merge normalized fields into event dict for condition evaluation
            for k, v in normalized.items():
                if k not in event or event[k] is None:
                    event[k] = v
        except json.JSONDecodeError:
            pass

    return event


async def _load_business_config(
    db: asyncpg.Connection,
    business_id: str,
) -> dict | None:
    """Load business configuration for the matched business."""
    row = await db.fetchrow(
        """
        SELECT
            business_id, business_name, automation_level,
            review_reply_policy, public_response_requires_approval,
            sms_requires_approval, email_requires_approval,
            brand_tone, sla_response_hours, office_timezone
        FROM business_configurations
        WHERE business_id = $1 AND active = TRUE
        """,
        business_id
    )
    return dict(row) if row else None


async def _load_signal_rules(
    db: asyncpg.Connection,
    event_type: str,
) -> list[dict]:
    """
    Load all active Signal rules for this event_type.
    Rules are read from the database at runtime.
    To add a new Signal: INSERT a row into signal_rules.
    No code changes required.
    """
    rows = await db.fetch(
        """
        SELECT
            signal_rule_id, signal_name, signal_bucket,
            event_type, network_category,
            conditions, required_fields,
            cooldown_hours, default_priority,
            description
        FROM signal_rules
        WHERE event_type = $1
          AND active = TRUE
        ORDER BY default_priority ASC
        """,
        event_type
    )
    return [dict(row) for row in rows]


# ---------------------------------------------------------------------------
# Required field validation
# ---------------------------------------------------------------------------

def _check_required_fields(
    required_fields: list[str],
    event_data: dict,
) -> list[str]:
    """
    Check that all required fields exist and have non-None values
    in the event_data dict. Supports dot notation.
    """
    missing = []
    for field_path in required_fields:
        parts   = field_path.split(".")
        current = event_data
        found   = True

        for part in parts:
            if not isinstance(current, dict) or part not in current:
                found = False
                break
            current = current[part]
            if current is None:
                found = False
                break

        if not found:
            missing.append(field_path)

    return missing


# ---------------------------------------------------------------------------
# Cooldown check
# ---------------------------------------------------------------------------

async def _check_cooldown(
    db: asyncpg.Connection,
    signal_rule_id: str,
    business_id: str,
    cooldown_hours: int,
) -> bool:
    """
    Check whether this Signal has fired recently for this business.
    Returns True if the Signal is still in its cooldown period.

    A Signal in cooldown should not fire again until the cooldown
    period has elapsed. This prevents noisy duplicate signals from
    the same recurring event type.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=cooldown_hours)

    row = await db.fetchrow(
        """
        SELECT signal_event_id FROM signal_events
        WHERE signal_rule_id = $1
          AND event_id IN (
              SELECT event_id FROM events
              WHERE business_id = $2
          )
          AND status != 'suppressed'
          AND created_at > $3
        LIMIT 1
        """,
        signal_rule_id, business_id, cutoff
    )
    return row is not None


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _extract_confidence(event_data: dict) -> float | None:
    """
    Extract the AI confidence score from event_data.
    Used to attach confidence context to the Signal candidate.
    """
    ai_context = event_data.get("ai_context") or {}
    return ai_context.get("confidence_score") or \
           event_data.get("ai_confidence_score")


def _identify_ai_fields_used(
    conditions: list[dict],
    event_data: dict,
) -> list[str]:
    """
    Identify which AI context fields were referenced in the matching
    conditions. Stored on the Signal candidate for audit and feedback.
    """
    ai_fields = []
    for condition in conditions:
        field = condition.get("field", "")
        if field.startswith("ai_context."):
            ai_field = field.replace("ai_context.", "")
            ai_context = event_data.get("ai_context") or {}
            if ai_context.get(ai_field) is not None:
                ai_fields.append(field)
    return ai_fields


# ---------------------------------------------------------------------------
# Database write
# ---------------------------------------------------------------------------

async def _store_signal_candidate(
    db: asyncpg.Connection,
    candidate: "SignalCandidate",
) -> None:
    """Store a Signal candidate in the signal_events table."""
    await db.execute(
        """
        INSERT INTO signal_events (
            signal_event_id, event_id, signal_rule_id,
            signal_name, signal_bucket,
            priority, confidence_score,
            conditions_met, ai_fields_used,
            business_management_context,
            status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        """,
        candidate.signal_event_id,
        candidate.event_id,
        candidate.signal_rule_id,
        candidate.signal_name,
        candidate.signal_bucket,
        candidate.priority,
        candidate.confidence_score,
        json.dumps(candidate.conditions_met),
        json.dumps(candidate.ai_fields_used),
        json.dumps(candidate.business_mgmt_context)
        if candidate.business_mgmt_context else None,
        "candidate",
        datetime.now(timezone.utc),
    )


# ---------------------------------------------------------------------------
# ID generator
# ---------------------------------------------------------------------------

def _generate_signal_event_id() -> str:
    return f"sig_evt_{uuid.uuid4().hex[:10]}"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

def _extract_business_mgmt_context(event_data: dict) -> dict | None:
    """
    Extract business management context from event_data.
    This is the consultant ownership snapshot carried from Section 1.
    Signal Detection does not use this to make decisions.
    It is stored on the Signal candidate for the Orchestrator.
    """
    context = event_data.get("consultant_context")
    if not context:
        # Also check inside normalized_payload
        context = event_data.get("business_mgmt_context")
    if not context:
        return None
    return {
        "primary_internal_owner":     context.get("primary_internal_owner"),
        "consultant_review_required": context.get("consultant_review_required"),
        "client_notification_mode":   context.get("client_notification_mode"),
        "approval_route":             context.get("approval_route"),
        "consultant_id":              context.get("consultant_id"),
        "default_escalation_owner":   context.get("default_escalation_owner"),
    }


class SignalCandidate:
    """
    A Signal that fired for an Event.
    Passed to Section 3 Orchestrator Decision.

    Multiple Signals can fire from one Event.
    The Orchestrator receives all candidates and selects the dominant Signal.

    business_mgmt_context carries consultant ownership context forward.
    Signal Detection does not use it to decide whether the Signal is valid.
    """

    def __init__(
        self,
        signal_event_id:       str,
        event_id:              str,
        signal_rule_id:        str,
        signal_name:           str,
        signal_bucket:         str,
        priority:              int,
        confidence_score:      float | None,
        conditions_met:        list[dict],
        ai_fields_used:        list[str],
        business_mgmt_context: dict | None = None,
    ):
        self.signal_event_id       = signal_event_id
        self.event_id              = event_id
        self.signal_rule_id        = signal_rule_id
        self.signal_name           = signal_name
        self.signal_bucket         = signal_bucket
        self.priority              = priority
        self.confidence_score      = confidence_score
        self.conditions_met        = conditions_met
        self.ai_fields_used        = ai_fields_used
        self.business_mgmt_context = business_mgmt_context

    def to_dict(self) -> dict:
        return {
            "signal_event_id":       self.signal_event_id,
            "event_id":              self.event_id,
            "signal_rule_id":        self.signal_rule_id,
            "signal_name":           self.signal_name,
            "signal_bucket":         self.signal_bucket,
            "priority":              self.priority,
            "confidence_score":      self.confidence_score,
            "conditions_met":        self.conditions_met,
            "ai_fields_used":        self.ai_fields_used,
            "business_mgmt_context": self.business_mgmt_context,
        }


class SignalDetectionResult:
    """
    The result of Signal Detection for one Event.
    Passed to the runner which feeds it to Section 3 Orchestrator Decision.

    If signal_candidates is empty, no Signal fired.
    The evaluation log records why each rule did or did not match —
    even when no Signal fires, the evaluation is auditable.
    """

    def __init__(
        self,
        event_id:          str,
        signal_candidates: list[SignalCandidate],
        no_signal_reason:  str | None = None,
        evaluations:       list[dict] | None = None,
        log:               "SignalLog | None" = None,
    ):
        self.event_id          = event_id
        self.signal_candidates = signal_candidates
        self.no_signal_reason  = no_signal_reason
        self.evaluations       = evaluations or []
        self.log               = log
        self.has_signals       = len(signal_candidates) > 0

    def to_dict(self) -> dict:
        return {
            "event_id":          self.event_id,
            "has_signals":       self.has_signals,
            "signal_count":      len(self.signal_candidates),
            "signal_candidates": [c.to_dict() for c in self.signal_candidates],
            "no_signal_reason":  self.no_signal_reason,
            "evaluations":       self.evaluations,
            "log":               self.log.to_dict() if self.log else None,
        }


class SignalLog:
    """Collects processing steps for the Signal Detection audit trail."""

    def __init__(self, event_id: str):
        self.event_id = event_id
        self.steps: list[dict] = []

    def step(self, status: str, message: str) -> None:
        self.steps.append({"status": status, "message": message})
        logger.debug("[signal:%s] %s: %s", self.event_id, status, message)

    def to_dict(self) -> dict:
        return {"event_id": self.event_id, "steps": self.steps}
