"""
ClearSky AI Decision System
Section 1: Event Intake
=======================
Converts raw provider/source activity into a trusted ClearSky Event Object.

The Event answers:
    - What happened?
    - Where did it come from?
    - Who or what is it connected to?
    - Is it clean enough to be evaluated later?

This section is fully deterministic except for Step 10 (AI extraction),
which runs only when the Provider Event Registry flags it as required.

Processing steps:
    1.  Raw input arrives from provider/source
    2.  Provider/source is identified deterministically
    3.  Provider event name is read exactly as received
    4.  Provider Event Registry is checked
    5.  ClearSky event_type and Network Category are assigned
    6.  Event draft is created
    7.  Structured fields are normalized
    8.  Relationships are matched
    9.  Duplicate detection runs
    10. AI extraction runs only if configured and content is unstructured
    11. raw_payload and normalized_payload are stored
    12. processing_status and flags are set
    13. handoff_eligible is determined

Boundary:
    This section stops at the Event boundary.
    It does not detect Signals, make Orchestrator decisions,
    queue Actions, execute anything, or record Outcomes.
"""

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import asyncpg

from clearsky.ai.extraction import extract_ai_context, MockExtractionResult
from clearsky.engine.condition_evaluator import build_event_data

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def process_raw_input(
    raw_payload: dict,
    db: asyncpg.Connection,
    ai_mock_mode: bool = False,
    ai_confidence_threshold: float = 0.75,
    default_business_id: str = "biz_apex_001",
) -> EventIntakeResult:
    """
    Process a raw provider payload through the full Section 1 pipeline.

    Args:
        raw_payload:              The untouched payload from the provider webhook.
        db:                       Active database connection.
        ai_mock_mode:             If True, skips real AI calls and uses mock data.
        ai_confidence_threshold:  Minimum confidence for AI context to be trusted.
        default_business_id:      Fallback business ID for demo purposes.

    Returns:
        EventIntakeResult with the created Event and processing details.
    """
    trace_id = _generate_trace_id()
    received_at = datetime.now(timezone.utc)

    log = IntakeLog(trace_id=trace_id)
    log.step("intake_started", f"Raw input received. trace_id={trace_id}")

    # ------------------------------------------------------------------
    # Step 1: Store raw input immediately — never lose the original
    # ------------------------------------------------------------------
    await _store_raw_input(db, trace_id, raw_payload, received_at)
    log.step("raw_input_stored", "Original payload stored in raw_inputs table.")

    # ------------------------------------------------------------------
    # Step 2: Identify provider deterministically
    # ------------------------------------------------------------------
    provider = _identify_provider(raw_payload)
    if not provider:
        log.step("provider_identification_failed",
                 f"Could not identify provider from payload. "
                 f"provider field: {raw_payload.get('provider')!r}")
        return await _create_blocked_event(
            db, trace_id, raw_payload, received_at,
            status="provider_identification_failed",
            log=log
        )
    log.step("provider_identified", f"Provider identified: {provider}")

    # ------------------------------------------------------------------
    # Step 3: Read provider event name exactly as received
    # ------------------------------------------------------------------
    provider_event_name = _read_provider_event_name(raw_payload)
    if not provider_event_name:
        log.step("provider_event_name_missing",
                 "Provider event name not found in payload.")
        return await _create_blocked_event(
            db, trace_id, raw_payload, received_at,
            status="provider_event_name_missing",
            log=log,
            provider=provider
        )
    log.step("provider_event_name_read",
             f"Provider event name: {provider_event_name}")

    # ------------------------------------------------------------------
    # Step 4 & 5: Check Provider Event Registry — assign event_type and
    #             Network Category deterministically. No guessing.
    # ------------------------------------------------------------------
    registry_entry = await _lookup_registry(db, provider, provider_event_name)
    if not registry_entry:
        log.step("registry_lookup_failed",
                 f"No registry entry for ({provider}, {provider_event_name}). "
                 f"Storing with failed status.")
        return await _create_blocked_event(
            db, trace_id, raw_payload, received_at,
            status="failed_registry_lookup",
            log=log,
            provider=provider,
            provider_event_name=provider_event_name
        )

    event_type        = registry_entry["event_type"]
    network_category  = registry_entry["network_category"]
    requires_ai       = registry_entry["requires_ai_extraction"]
    required_fields   = json.loads(registry_entry["required_fields"] or "[]")
    registry_version  = registry_entry["registry_version"]

    log.step("registry_matched",
             f"Registry match: event_type={event_type}, "
             f"network_category={network_category}, "
             f"requires_ai={requires_ai}")

    # ------------------------------------------------------------------
    # Step 6: Create Event draft
    # ------------------------------------------------------------------
    event_id = _generate_event_id()
    log.step("event_draft_created", f"Event draft created: event_id={event_id}")

    # ------------------------------------------------------------------
    # Step 7: Normalize structured fields
    # ------------------------------------------------------------------
    normalized = _normalize_fields(raw_payload, provider, event_type)
    missing = _check_required_fields(required_fields, raw_payload, normalized)
    if missing:
        log.step("required_fields_missing",
                 f"Required fields not found: {missing}")
        return await _create_blocked_event(
            db, trace_id, raw_payload, received_at,
            status="required_fields_missing",
            log=log,
            provider=provider,
            provider_event_name=provider_event_name,
            event_type=event_type,
            network_category=network_category,
            event_id=event_id,
            normalized=normalized
        )
    log.step("fields_normalized", "Structured fields normalized successfully.")

    # ------------------------------------------------------------------
    # Step 8: Match relationships deterministically
    # ------------------------------------------------------------------
    relationships = await _match_relationships(
        db, provider, raw_payload, normalized, default_business_id
    )
    consultant_context = relationships.get("consultant_context")
    log.step("relationships_matched",
             f"Relationships: business_matched={relationships['business_matched']}, "
             f"customer_matched={relationships['customer_matched']}, "
             f"consultant_assigned={consultant_context is not None}")

    if consultant_context:
        log.step("consultant_context_loaded",
                 f"Consultant context loaded: "
                 f"consultant={consultant_context.get('consultant_name')}, "
                 f"primary_owner={consultant_context.get('primary_internal_owner')}, "
                 f"approval_route={consultant_context.get('approval_route')}. "
                 f"Context carried forward. Not used for Event decisions.")

    if not relationships["business_matched"]:
        log.step("business_match_failed",
                 "Could not match event to a known business.")
        return await _create_blocked_event(
            db, trace_id, raw_payload, received_at,
            status="business_match_failed",
            log=log,
            provider=provider,
            provider_event_name=provider_event_name,
            event_type=event_type,
            network_category=network_category,
            event_id=event_id,
            normalized=normalized,
            relationships=relationships
        )

    # ------------------------------------------------------------------
    # Step 9: Duplicate detection
    # ------------------------------------------------------------------
    is_duplicate, duplicate_of = await _check_duplicate(
        db, provider, raw_payload, normalized
    )
    if is_duplicate:
        log.step("duplicate_detected",
                 f"Duplicate of event_id={duplicate_of}. Blocking.")
        return await _create_duplicate_event(
            db, trace_id, raw_payload, received_at,
            event_id=event_id,
            provider=provider,
            provider_event_name=provider_event_name,
            event_type=event_type,
            network_category=network_category,
            normalized=normalized,
            relationships=relationships,
            registry_version=registry_version,
            duplicate_of=duplicate_of,
            log=log
        )
    log.step("duplicate_check_passed", "No duplicate found.")

    # ------------------------------------------------------------------
    # Step 10: AI extraction — only if registry requires it
    # ------------------------------------------------------------------
    ai_context = None
    ai_extraction_completed = False
    ai_confidence_score = None
    ai_context_quality = None
    processing_status = "normalized"

    if requires_ai:
        log.step("ai_extraction_started",
                 "Registry requires AI extraction. Calling extraction module.")
        try:
            ai_result = await extract_ai_context(
                event_type=event_type,
                raw_payload=raw_payload,
                normalized=normalized,
                mock_mode=ai_mock_mode
            )
            ai_context             = ai_result.context
            ai_extraction_completed = True
            ai_confidence_score    = ai_result.confidence_score
            ai_context_quality     = _score_quality(ai_result.confidence_score,
                                                     ai_confidence_threshold)
            processing_status      = "ai_extraction_completed"
            log.step("ai_extraction_completed",
                     f"AI extraction complete. "
                     f"confidence={ai_confidence_score}, "
                     f"quality={ai_context_quality}")
        except Exception as e:
            processing_status = "ai_extraction_failed"
            log.step("ai_extraction_failed", f"AI extraction error: {e}")
            logger.error("AI extraction failed for event %s: %s", event_id, e)
    else:
        processing_status = "normalized"
        log.step("ai_extraction_skipped",
                 "AI extraction not required for this event type.")

    # ------------------------------------------------------------------
    # Detect rating/content mismatch (GBP reviews only)
    # ------------------------------------------------------------------
    rating_content_mismatch = False
    if event_type in ("review_received", "review_updated") and ai_context:
        rating_content_mismatch = _detect_rating_mismatch(
            normalized.get("rating"),
            ai_context.get("sentiment"),
            ai_confidence_score,
            ai_confidence_threshold
        )
        if rating_content_mismatch:
            log.step("rating_content_mismatch_detected",
                     f"Rating {normalized.get('rating')} conflicts with "
                     f"AI sentiment '{ai_context.get('sentiment')}'. "
                     f"Flagging event.")

    # ------------------------------------------------------------------
    # Step 11 & 12: Build normalized payload, set flags
    # ------------------------------------------------------------------
    normalized_payload = _build_normalized_payload(
        normalized, relationships, consultant_context
    )

    # ------------------------------------------------------------------
    # Step 13: Determine handoff eligibility
    # ------------------------------------------------------------------
    handoff_eligible, handoff_reason = _determine_handoff_eligibility(
        provider=provider,
        provider_event_name=provider_event_name,
        event_type=event_type,
        network_category=network_category,
        business_matched=relationships["business_matched"],
        is_duplicate=False,
        requires_ai=requires_ai,
        ai_extraction_completed=ai_extraction_completed,
        processing_status=processing_status,
    )
    final_status = "handoff_eligible" if handoff_eligible else processing_status
    log.step(
        "handoff_eligibility_determined",
        f"handoff_eligible={handoff_eligible}. Reason: {handoff_reason}"
    )

    # ------------------------------------------------------------------
    # Store the complete Event Object
    # ------------------------------------------------------------------
    event_record = await _store_event(
        db=db,
        event_id=event_id,
        trace_id=trace_id,
        provider=provider,
        provider_event_name=provider_event_name,
        event_type=event_type,
        network_category=network_category,
        registry_version=registry_version,
        received_at=received_at,
        normalized=normalized,
        normalized_payload=normalized_payload,
        raw_payload=raw_payload,
        relationships=relationships,
        ai_context=ai_context,
        ai_extraction_completed=ai_extraction_completed,
        ai_confidence_score=ai_confidence_score,
        ai_context_quality=ai_context_quality,
        requires_ai=requires_ai,
        is_duplicate=False,
        duplicate_of_event_id=None,
        rating_content_mismatch=rating_content_mismatch,
        handoff_eligible=handoff_eligible,
        processing_status=final_status,
    )

    await _store_processing_log(db, event_id, log)

    log.step("event_stored",
             f"Event stored successfully. "
             f"event_id={event_id}, "
             f"handoff_eligible={handoff_eligible}")

    return EventIntakeResult(
        success=True,
        event_id=event_id,
        trace_id=trace_id,
        event_type=event_type,
        network_category=network_category,
        handoff_eligible=handoff_eligible,
        is_duplicate=False,
        rating_content_mismatch=rating_content_mismatch,
        processing_status=final_status,
        log=log,
        event_record=event_record,
    )


# ---------------------------------------------------------------------------
# Step 2: Provider identification
# ---------------------------------------------------------------------------

KNOWN_PROVIDERS = {
    "google_business_profile",
    "telnyx_voice",
    "telnyx_sms",
    "clearsky_website_forms",
    "dataforseo",
    "contentradar",
    "email_provider",
    "quote_system",
    "booking_system",
    "crm_system",
    "social_media",
    "matomo",
    "clearsky_viewroom",
    "clearsky_visualizer",
    "competitor_intelligence",
    "system_health",
}

def _identify_provider(raw_payload: dict) -> str | None:
    """
    Identify the provider from the incoming payload.
    Checks 'provider' field first. Never guesses.
    """
    provider = raw_payload.get("provider")
    if provider and provider in KNOWN_PROVIDERS:
        return provider
    return None


# ---------------------------------------------------------------------------
# Step 3: Provider event name
# ---------------------------------------------------------------------------

def _read_provider_event_name(raw_payload: dict) -> str | None:
    """
    Read the provider event name exactly as received.
    Checks common field names used by different providers.
    """
    for key in ("event", "event_type", "provider_event", "provider_event_name", "type"):
        value = raw_payload.get(key)
        if value and isinstance(value, str):
            return value
    return None


# ---------------------------------------------------------------------------
# Step 4 & 5: Registry lookup
# ---------------------------------------------------------------------------

async def _lookup_registry(
    db: asyncpg.Connection,
    provider: str,
    provider_event_name: str
) -> dict | None:
    """
    Deterministic registry lookup. Returns registry row or None.
    Never guesses. Never uses AI.
    """
    row = await db.fetchrow(
        """
        SELECT event_type, network_category, requires_ai_extraction,
               required_fields, registry_version
        FROM provider_event_registry
        WHERE provider = $1
          AND provider_event_name = $2
          AND active = TRUE
        """,
        provider, provider_event_name
    )
    return dict(row) if row else None


# ---------------------------------------------------------------------------
# Step 7: Field normalization
# ---------------------------------------------------------------------------

def _normalize_fields(
    raw_payload: dict,
    provider: str,
    event_type: str
) -> dict:
    """
    Normalize structured fields from the raw payload.
    Phone numbers -> E.164 format where possible.
    Emails -> lowercase.
    Timestamps -> ISO 8601 UTC.
    Provider IDs -> preserved exactly.
    """
    normalized: dict[str, Any] = {}

    # Common fields across providers
    normalized["provider_event_id"] = (
        raw_payload.get("review_id") or
        raw_payload.get("call_id") or
        raw_payload.get("call_control_id") or
        raw_payload.get("message_id") or
        raw_payload.get("form_submission_id") or
        raw_payload.get("appointment_id") or
        raw_payload.get("quote_id") or
        raw_payload.get("id") or
        None
    )

    normalized["occurred_at"] = _normalize_timestamp(
        raw_payload.get("created_at") or
        raw_payload.get("occurred_at") or
        raw_payload.get("submitted_at") or
        raw_payload.get("detected_at") or
        raw_payload.get("timestamp")
    )

    # GBP-specific fields
    if provider == "google_business_profile":
        normalized["gbp_location_id"] = raw_payload.get("location_id")
        normalized["gbp_review_id"]   = raw_payload.get("review_id")
        normalized["reviewer_name"]   = raw_payload.get("reviewer_name") or \
                                        raw_payload.get("reviewer", {}).get("displayName")
        normalized["rating"]          = _normalize_rating(raw_payload.get("rating") or
                                                           raw_payload.get("starRating"))
        normalized["review_text"]     = (
            raw_payload.get("review_text") or
            raw_payload.get("comment") or
            raw_payload.get("review", {}).get("comment") or
            ""
        ).strip()

    # Telnyx Voice fields
    if provider == "telnyx_voice":
        normalized["from_phone"]  = _normalize_phone(raw_payload.get("from"))
        normalized["to_phone"]    = _normalize_phone(raw_payload.get("to"))
        normalized["direction"]   = raw_payload.get("direction", "inbound")
        normalized["call_id"]     = raw_payload.get("call_control_id") or \
                                    raw_payload.get("call_session_id")

    # Telnyx SMS fields
    if provider == "telnyx_sms":
        normalized["from_phone"]  = _normalize_phone(raw_payload.get("from"))
        normalized["to_phone"]    = _normalize_phone(raw_payload.get("to"))
        normalized["sms_text"]    = raw_payload.get("text") or \
                                    raw_payload.get("body") or ""
        normalized["message_id"]  = raw_payload.get("id") or \
                                    raw_payload.get("message_id")

    # Website forms
    if provider == "clearsky_website_forms":
        normalized["form_id"]         = raw_payload.get("form_id")
        normalized["customer_name"]   = raw_payload.get("name")
        normalized["customer_email"]  = _normalize_email(raw_payload.get("email"))
        normalized["customer_phone"]  = _normalize_phone(raw_payload.get("phone"))
        normalized["message_text"]    = raw_payload.get("message") or ""
        normalized["source_page"]     = raw_payload.get("page_url")
        normalized["utm_source"]      = raw_payload.get("utm_source")
        normalized["utm_campaign"]    = raw_payload.get("utm_campaign")

    # Email provider
    if provider == "email_provider":
        normalized["from_email"]  = _normalize_email(raw_payload.get("from"))
        normalized["to_email"]    = _normalize_email(raw_payload.get("to"))
        normalized["subject"]     = raw_payload.get("subject") or ""
        normalized["message_id"]  = raw_payload.get("message_id")

    # ContentRadar
    if provider == "contentradar":
        normalized["keyword"]         = raw_payload.get("keyword")
        normalized["scope"]           = raw_payload.get("scope")
        normalized["market_id"]       = raw_payload.get("market") or \
                                        raw_payload.get("market_id")
        normalized["baseline_volume"] = raw_payload.get("baseline_volume")
        normalized["current_volume"]  = raw_payload.get("current_volume")
        normalized["change_percent"]  = raw_payload.get("change_percent")

    # DataForSEO
    if provider == "dataforseo":
        normalized["keyword"]   = raw_payload.get("keyword")
        normalized["old_rank"]  = raw_payload.get("old_rank") or \
                                  raw_payload.get("previous_rank")
        normalized["new_rank"]  = raw_payload.get("new_rank") or \
                                  raw_payload.get("current_rank")

    return normalized


def _normalize_phone(phone: str | None) -> str | None:
    """Basic phone normalization. Strips non-digit chars, adds + prefix."""
    if not phone:
        return None
    digits = "".join(c for c in str(phone) if c.isdigit())
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    if len(digits) > 7:
        return f"+{digits}"
    return phone


def _normalize_email(email: str | None) -> str | None:
    """Lowercase and strip email."""
    if not email:
        return None
    return str(email).lower().strip()


def _normalize_timestamp(ts: str | None) -> str | None:
    """Ensure timestamp is ISO 8601 format with UTC timezone."""
    if not ts:
        return None
    try:
        # Try parsing common formats
        for fmt in (
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%d %H:%M:%S",
        ):
            try:
                dt = datetime.strptime(str(ts), fmt)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.isoformat()
            except ValueError:
                continue
    except Exception:
        pass
    return str(ts)  # Return as-is if we can't parse it


def _normalize_rating(rating: Any) -> int | None:
    """
    Normalize star rating to integer 1-5.
    Handles integer, float, and GBP string format (ONE, TWO, THREE, FOUR, FIVE).
    """
    if rating is None:
        return None
    gbp_rating_map = {
        "ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5
    }
    if isinstance(rating, str) and rating.upper() in gbp_rating_map:
        return gbp_rating_map[rating.upper()]
    try:
        val = int(float(rating))
        return max(1, min(5, val))  # Clamp to 1-5
    except (TypeError, ValueError):
        return None


def _check_required_fields(
    required_fields: list[str],
    raw_payload: dict,
    normalized: dict
) -> list[str]:
    """
    Check that all required fields are present in either the raw payload
    or the normalized output.
    Returns list of missing field names. Empty list means all present.
    """
    missing = []
    for field_name in required_fields:
        in_raw        = raw_payload.get(field_name) is not None
        in_normalized = normalized.get(field_name) is not None
        if not in_raw and not in_normalized:
            missing.append(field_name)
    return missing


# ---------------------------------------------------------------------------
# Step 8: Relationship matching
# ---------------------------------------------------------------------------

async def _match_relationships(
    db: asyncpg.Connection,
    provider: str,
    raw_payload: dict,
    normalized: dict,
    default_business_id: str,
) -> dict:
    """
    Deterministic relationship matching.
    Maps provider location/account IDs to ClearSky business IDs.

    Once the business is matched, also loads consultant ownership context
    from business_configurations. This context is not used to make any
    decisions in Section 1 — it is carried forward as context so the
    Orchestrator knows who manages the account without reloading it.

    Returns a dict of relationship flags, matched IDs, and consultant context.
    """
    relationships: dict[str, Any] = {
        "business_id":              None,
        "customer_id":              None,
        "lead_id":                  None,
        "thread_id":                None,
        "quote_id":                 None,
        "appointment_id":           None,
        "campaign_id":              None,
        "market_id":                None,
        "business_matched":         False,
        "customer_matched":         False,
        "lead_matched":             False,
        "thread_matched":           False,
        # Consultant ownership context — carried forward, not used here
        "consultant_context":       None,
    }

    # GBP: match via location_id
    if provider == "google_business_profile":
        location_id = normalized.get("gbp_location_id") or \
                      raw_payload.get("location_id")
        if location_id:
            # In demo mode, map known location IDs directly
            location_map = {
                "gbp_loc_apex_001": "biz_apex_001",
                "gbp_loc_demo_001": "biz_demo_001",
            }
            business_id = location_map.get(location_id) or default_business_id
            relationships["business_id"]     = business_id
            relationships["business_matched"] = True

    # Telnyx: match via phone number to business
    elif provider in ("telnyx_voice", "telnyx_sms"):
        to_phone = normalized.get("to_phone")
        if to_phone:
            relationships["business_id"]     = default_business_id
            relationships["business_matched"] = True

    # Website forms: match via business account
    elif provider == "clearsky_website_forms":
        relationships["business_id"]     = default_business_id
        relationships["business_matched"] = True

    # Other providers: use default business in demo mode
    else:
        relationships["business_id"]     = default_business_id
        relationships["business_matched"] = True

    # Market matching for ContentRadar
    if provider == "contentradar":
        relationships["market_id"] = normalized.get("market_id")

    # Once business is matched, load consultant ownership context.
    # This is context only — Section 1 does not use it to make decisions.
    # The Orchestrator reads it in Section 3 to determine routing and approval.
    if relationships["business_matched"] and relationships["business_id"]:
        consultant_context = await _load_consultant_context(
            db, relationships["business_id"]
        )
        relationships["consultant_context"] = consultant_context

    return relationships


async def _load_consultant_context(
    db: asyncpg.Connection,
    business_id: str,
) -> dict | None:
    """
    Load consultant ownership context for a matched business.
    Returns a structured dict or None if no consultant is assigned.

    This context is not used in Section 1 to make any decisions.
    It is stored on the Event and carried forward to Section 3.
    """
    row = await db.fetchrow(
        """
        SELECT
            consultant_id,
            consultant_name,
            consultant_email,
            consultant_role,
            primary_internal_owner,
            default_escalation_owner,
            client_notification_mode,
            approval_route,
            consultant_review_required,
            auto_notify_consultant,
            auto_notify_business_owner,
            after_hours_escalation_owner,
            business_owner_id,
            business_owner_name,
            business_owner_email
        FROM business_configurations
        WHERE business_id = $1
          AND active = TRUE
          AND consultant_id IS NOT NULL
        """,
        business_id
    )

    if not row:
        return None

    return {
        "consultant_id":               row["consultant_id"],
        "consultant_name":             row["consultant_name"],
        "consultant_email":            row["consultant_email"],
        "consultant_role":             row["consultant_role"],
        "primary_internal_owner":      row["primary_internal_owner"],
        "default_escalation_owner":    row["default_escalation_owner"],
        "client_notification_mode":    row["client_notification_mode"],
        "approval_route":              row["approval_route"],
        "consultant_review_required":  row["consultant_review_required"],
        "auto_notify_consultant":      row["auto_notify_consultant"],
        "auto_notify_business_owner":  row["auto_notify_business_owner"],
        "after_hours_escalation_owner": row["after_hours_escalation_owner"],
        "business_owner_id":           row["business_owner_id"],
        "business_owner_name":         row["business_owner_name"],
        "business_owner_email":        row["business_owner_email"],
    }


# ---------------------------------------------------------------------------
# Step 9: Duplicate detection
# ---------------------------------------------------------------------------

async def _check_duplicate(
    db: asyncpg.Connection,
    provider: str,
    raw_payload: dict,
    normalized: dict,
) -> tuple[bool, str | None]:
    """
    Deterministic duplicate detection.
    Checks provider-specific IDs against existing events.
    Returns (is_duplicate, original_event_id or None).
    """
    provider_event_id = normalized.get("provider_event_id")
    gbp_review_id     = normalized.get("gbp_review_id")

    # Check by GBP review ID
    if gbp_review_id:
        existing = await db.fetchrow(
            """
            SELECT event_id FROM events
            WHERE gbp_review_id = $1
              AND provider = $2
              AND is_duplicate = FALSE
            LIMIT 1
            """,
            gbp_review_id, provider
        )
        if existing:
            return True, existing["event_id"]

    # Check by generic provider event ID
    if provider_event_id:
        existing = await db.fetchrow(
            """
            SELECT event_id FROM events
            WHERE provider_event_id = $1
              AND provider = $2
              AND is_duplicate = FALSE
            LIMIT 1
            """,
            str(provider_event_id), provider
        )
        if existing:
            return True, existing["event_id"]

    return False, None


# ---------------------------------------------------------------------------
# Rating / content mismatch detection
# ---------------------------------------------------------------------------

def _detect_rating_mismatch(
    rating: int | None,
    sentiment: str | None,
    confidence_score: float | None,
    threshold: float,
) -> bool:
    """
    Detect when star rating and AI sentiment conflict.

    Mismatch cases:
        - Rating 1-2 with positive sentiment
        - Rating 4-5 with negative sentiment

    Only flags if confidence is above threshold — we don't flag
    mismatches when AI wasn't confident about the sentiment.
    """
    if rating is None or sentiment is None:
        return False
    if confidence_score is None or confidence_score < threshold:
        return False

    low_rating_positive  = rating <= 2 and sentiment == "positive"
    high_rating_negative = rating >= 4 and sentiment == "negative"

    return low_rating_positive or high_rating_negative


# ---------------------------------------------------------------------------
# Step 13: Handoff eligibility
# ---------------------------------------------------------------------------

def _determine_handoff_eligibility(
    provider: str,
    provider_event_name: str,
    event_type: str,
    network_category: str,
    business_matched: bool,
    is_duplicate: bool,
    requires_ai: bool,
    ai_extraction_completed: bool,
    processing_status: str,
) -> tuple[bool, str]:
    """
    Determine whether the Event is clean enough for Signal Detection.

    handoff_eligible = True means the Event is ready to be evaluated.
    It does NOT mean a Signal will fire.

    Returns (handoff_eligible, reason).
    """
    if is_duplicate:
        return False, "Event is a duplicate. Original event will be evaluated."

    if not business_matched:
        return False, "Business could not be matched. Cannot proceed safely."

    if processing_status in (
        "provider_identification_failed",
        "provider_event_name_missing",
        "failed_registry_lookup",
        "required_fields_missing",
        "business_match_failed",
    ):
        return False, f"Processing failed at: {processing_status}"

    if requires_ai and not ai_extraction_completed:
        # Some events can proceed without AI if the event type doesn't
        # depend on AI context for its core signals
        ai_dependent_types = {"review_received", "review_updated",
                              "inbound_sms", "voicemail_received",
                              "lead_form_submitted"}
        if event_type in ai_dependent_types:
            return False, "AI extraction required but not completed."
        # Non-AI-dependent types can still be handoff eligible
        return True, "AI extraction pending but not required for core signals."

    return True, "All required conditions met."


# ---------------------------------------------------------------------------
# AI confidence quality scoring
# ---------------------------------------------------------------------------

def _score_quality(confidence: float | None, threshold: float) -> str:
    if confidence is None:
        return "unknown"
    if confidence >= 0.85:
        return "high"
    if confidence >= threshold:
        return "medium"
    return "low"


# ---------------------------------------------------------------------------
# Database write helpers
# ---------------------------------------------------------------------------

async def _store_raw_input(
    db: asyncpg.Connection,
    trace_id: str,
    raw_payload: dict,
    received_at: datetime,
) -> None:
    provider = raw_payload.get("provider", "unknown")
    await db.execute(
        """
        INSERT INTO raw_inputs (trace_id, provider, received_at, raw_payload)
        VALUES ($1, $2, $3, $4)
        """,
        trace_id,
        provider,
        received_at,
        json.dumps(raw_payload)
    )


async def _store_event(
    db: asyncpg.Connection,
    event_id: str,
    trace_id: str,
    provider: str,
    provider_event_name: str,
    event_type: str,
    network_category: str,
    registry_version: str,
    received_at: datetime,
    normalized: dict,
    normalized_payload: dict,
    raw_payload: dict,
    relationships: dict,
    ai_context: dict | None,
    ai_extraction_completed: bool,
    ai_confidence_score: float | None,
    ai_context_quality: str | None,
    requires_ai: bool,
    is_duplicate: bool,
    duplicate_of_event_id: str | None,
    rating_content_mismatch: bool,
    handoff_eligible: bool,
    processing_status: str,
) -> dict:
    created_at = datetime.now(timezone.utc)

    await db.execute(
        """
        INSERT INTO events (
            event_id, trace_id, provider, provider_event_name,
            provider_event_id, event_type, network_category, registry_version,
            occurred_at, received_at, created_at,
            business_id, customer_id, lead_id, thread_id,
            quote_id, appointment_id, campaign_id, market_id,
            gbp_location_id, gbp_review_id, reviewer_name, rating, review_text,
            requires_ai_extraction, ai_extraction_completed,
            ai_context, ai_confidence_score, ai_context_quality,
            raw_payload, normalized_payload,
            business_matched, customer_matched, lead_matched, thread_matched,
            is_duplicate, duplicate_of_event_id,
            rating_content_mismatch, handoff_eligible, processing_status
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11,
            $12, $13, $14, $15,
            $16, $17, $18, $19,
            $20, $21, $22, $23, $24,
            $25, $26,
            $27, $28, $29,
            $30, $31,
            $32, $33, $34, $35,
            $36, $37,
            $38, $39, $40
        )
        """,
        event_id, trace_id, provider, provider_event_name,
        str(normalized.get("provider_event_id") or ""),
        event_type, network_category, registry_version,
        normalized.get("occurred_at"), received_at, created_at,
        relationships.get("business_id"),
        relationships.get("customer_id"),
        relationships.get("lead_id"),
        relationships.get("thread_id"),
        relationships.get("quote_id"),
        relationships.get("appointment_id"),
        relationships.get("campaign_id"),
        relationships.get("market_id"),
        normalized.get("gbp_location_id"),
        normalized.get("gbp_review_id"),
        normalized.get("reviewer_name"),
        normalized.get("rating"),
        normalized.get("review_text"),
        requires_ai, ai_extraction_completed,
        json.dumps(ai_context) if ai_context else None,
        ai_confidence_score, ai_context_quality,
        json.dumps(raw_payload),
        json.dumps(normalized_payload),
        relationships.get("business_matched", False),
        relationships.get("customer_matched", False),
        relationships.get("lead_matched", False),
        relationships.get("thread_matched", False),
        is_duplicate, duplicate_of_event_id,
        rating_content_mismatch, handoff_eligible, processing_status
    )

    return {
        "event_id": event_id,
        "event_type": event_type,
        "network_category": network_category,
        "handoff_eligible": handoff_eligible,
        "processing_status": processing_status,
        "rating_content_mismatch": rating_content_mismatch,
        **relationships,
    }


async def _store_processing_log(
    db: asyncpg.Connection,
    event_id: str,
    log: "IntakeLog",
) -> None:
    for step in log.steps:
        await db.execute(
            """
            INSERT INTO event_processing_logs (event_id, status, message, logged_at)
            VALUES ($1, $2, $3, $4)
            """,
            event_id, step["status"], step["message"],
            datetime.now(timezone.utc)
        )


async def _create_blocked_event(
    db: asyncpg.Connection,
    trace_id: str,
    raw_payload: dict,
    received_at: datetime,
    status: str,
    log: "IntakeLog",
    provider: str = "unknown",
    provider_event_name: str | None = None,
    event_type: str | None = None,
    network_category: str | None = None,
    event_id: str | None = None,
    normalized: dict | None = None,
    relationships: dict | None = None,
) -> "EventIntakeResult":
    """Store a blocked event with failed processing status."""
    if not event_id:
        event_id = _generate_event_id()
    if not normalized:
        normalized = {}
    if not relationships:
        relationships = {
            "business_id": None, "customer_id": None, "lead_id": None,
            "thread_id": None, "quote_id": None, "appointment_id": None,
            "campaign_id": None, "market_id": None,
            "business_matched": False, "customer_matched": False,
            "lead_matched": False, "thread_matched": False,
        }

    await db.execute(
        """
        INSERT INTO events (
            event_id, trace_id, provider, provider_event_name,
            event_type, network_category,
            received_at, created_at,
            raw_payload, normalized_payload,
            business_matched, is_duplicate,
            handoff_eligible, processing_status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        """,
        event_id, trace_id, provider,
        provider_event_name or "unknown",
        event_type, network_category,
        received_at, datetime.now(timezone.utc),
        json.dumps(raw_payload), json.dumps(normalized),
        False, False, False, status
    )
    await _store_processing_log(db, event_id, log)

    return EventIntakeResult(
        success=False,
        event_id=event_id,
        trace_id=trace_id,
        event_type=event_type,
        network_category=network_category,
        handoff_eligible=False,
        is_duplicate=False,
        rating_content_mismatch=False,
        processing_status=status,
        log=log,
        event_record=None,
    )


async def _create_duplicate_event(
    db: asyncpg.Connection,
    trace_id: str,
    raw_payload: dict,
    received_at: datetime,
    event_id: str,
    provider: str,
    provider_event_name: str,
    event_type: str,
    network_category: str,
    normalized: dict,
    relationships: dict,
    registry_version: str,
    duplicate_of: str,
    log: "IntakeLog",
) -> "EventIntakeResult":
    """Store a duplicate event — blocked, original preserved."""
    await db.execute(
        """
        INSERT INTO events (
            event_id, trace_id, provider, provider_event_name,
            event_type, network_category, registry_version,
            received_at, created_at,
            business_id, raw_payload, normalized_payload,
            business_matched, is_duplicate, duplicate_of_event_id,
            handoff_eligible, processing_status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        """,
        event_id, trace_id, provider, provider_event_name,
        event_type, network_category, registry_version,
        received_at, datetime.now(timezone.utc),
        relationships.get("business_id"),
        json.dumps(raw_payload), json.dumps(normalized),
        relationships.get("business_matched", False),
        True, duplicate_of,
        False, "duplicate_ignored"
    )
    await _store_processing_log(db, event_id, log)

    return EventIntakeResult(
        success=False,
        event_id=event_id,
        trace_id=trace_id,
        event_type=event_type,
        network_category=network_category,
        handoff_eligible=False,
        is_duplicate=True,
        rating_content_mismatch=False,
        processing_status="duplicate_ignored",
        log=log,
        event_record=None,
    )


# ---------------------------------------------------------------------------
# Payload builder
# ---------------------------------------------------------------------------

def _build_normalized_payload(
    normalized: dict,
    relationships: dict,
    consultant_context: dict | None = None,
) -> dict:
    """Build the normalized_payload stored alongside the raw_payload."""
    payload = {
        k: v for k, v in {**normalized, **relationships}.items()
        if v is not None and k != "consultant_context"
    }
    if consultant_context:
        payload["consultant_context"] = consultant_context
    return payload


# ---------------------------------------------------------------------------
# ID generators
# ---------------------------------------------------------------------------

def _generate_trace_id() -> str:
    return f"trace_{uuid.uuid4().hex[:12]}"


def _generate_event_id() -> str:
    return f"evt_{uuid.uuid4().hex[:12]}"


# ---------------------------------------------------------------------------
# Result and log objects
# ---------------------------------------------------------------------------

class IntakeLog:
    """Collects processing steps for audit trail storage."""

    def __init__(self, trace_id: str):
        self.trace_id = trace_id
        self.steps: list[dict] = []

    def step(self, status: str, message: str) -> None:
        self.steps.append({"status": status, "message": message})
        logger.debug("[%s] %s: %s", self.trace_id, status, message)

    def to_dict(self) -> dict:
        return {"trace_id": self.trace_id, "steps": self.steps}


class EventIntakeResult:
    """
    The result of processing one raw input through Section 1.

    Passed to the runner which feeds it into Section 2 Signal Detection
    if handoff_eligible is True.
    """

    def __init__(
        self,
        success: bool,
        event_id: str,
        trace_id: str,
        event_type: str | None,
        network_category: str | None,
        handoff_eligible: bool,
        is_duplicate: bool,
        rating_content_mismatch: bool,
        processing_status: str,
        log: IntakeLog,
        event_record: dict | None,
    ):
        self.success                 = success
        self.event_id                = event_id
        self.trace_id                = trace_id
        self.event_type              = event_type
        self.network_category        = network_category
        self.handoff_eligible        = handoff_eligible
        self.is_duplicate            = is_duplicate
        self.rating_content_mismatch = rating_content_mismatch
        self.processing_status       = processing_status
        self.log                     = log
        self.event_record            = event_record

    def to_dict(self) -> dict:
        return {
            "success":                  self.success,
            "event_id":                 self.event_id,
            "trace_id":                 self.trace_id,
            "event_type":               self.event_type,
            "network_category":         self.network_category,
            "handoff_eligible":         self.handoff_eligible,
            "is_duplicate":             self.is_duplicate,
            "rating_content_mismatch":  self.rating_content_mismatch,
            "processing_status":        self.processing_status,
            "log":                      self.log.to_dict(),
        }
