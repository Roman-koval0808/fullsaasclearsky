"""
ClearSky AI Decision System
Section 3: Orchestrator Decision
=================================
Receives valid Signal candidates from Section 2 and decides:
    - Which Signal matters most (dominant Signal)
    - Whether action is allowed under business rules and safety policy
    - Which Action should be selected from the Action Library
    - What execution mode applies
    - Who owns the action
    - What parameters must be attached

The Orchestrator is rules-based and auditable.
Every decision is recorded with the reasoning that produced it.

MULTI-TENANT DESIGN:
    Each client has their own Orchestrator configuration.
    The engine loads rules in this order:
        1. Client orchestrator profile (automation level, disabled signals, domain modes)
        2. Safety rules (global, is_safety_rule = TRUE — cannot be overridden)
        3. Client-specific orchestrator rules (business_id = client)
        4. Global orchestrator rules (business_id IS NULL)
    Client rules win over global defaults.
    Safety rules win over everything.

Processing steps:
    1.  Receive valid Signal candidates from Section 2
    2.  Confirm entry eligibility (candidates exist, event is valid)
    3.  Load client orchestrator profile
    4.  Load safety rules (non-negotiable, applied first)
    5.  Load client and global orchestrator rules
    6.  Load signal-to-action mappings for this client
    7.  Apply disabled Signal filter from client profile
    8.  Rank Signal candidates by priority, bucket, and confidence
    9.  Identify dominant Signal
    10. Suppress supporting Signals per orchestrator rules
    11. Select Actions from Action Library via signal-action mappings
    12. Apply client execution mode and owner overrides
    13. Apply safety rules — block or escalate where required
    14. Create auditable Orchestrator Decision record
    15. Return decision to runner for Section 4

Boundary:
    This section stops at the Decision boundary.
    It does not create queue records, execute anything,
    record Outcomes, or collect Feedback.
    Those belong to Sections 4 through 7.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import asyncpg

from clearsky.engine.condition_evaluator import (
    evaluate_conditions,
    build_event_data,
)
from clearsky.engine.section_2_signal import SignalCandidate

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Signal bucket priority weights
# Used to break ties when multiple Signals have the same numeric priority
# ---------------------------------------------------------------------------

BUCKET_WEIGHTS = {
    "Risk":        1,   # Highest urgency — always surfaces first
    "Bottleneck":  2,
    "Opportunity": 3,
    "Performance": 4,
    "Competitive": 5,
    "Momentum":    6,   # Lowest urgency — positive signals
}


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def make_decision(
    event_id: str,
    signal_candidates: list[SignalCandidate],
    db: asyncpg.Connection,
) -> OrchestratorDecisionResult:
    """
    Run the Orchestrator Decision for a set of Signal candidates.

    Args:
        event_id:           The event_id being processed.
        signal_candidates:  Signal candidates from Section 2.
        db:                 Active database connection.

    Returns:
        OrchestratorDecisionResult with the auditable decision record.
    """
    log = OrchestratorLog(event_id=event_id)
    log.step("orchestrator_started",
             f"Orchestrator started. "
             f"{len(signal_candidates)} Signal candidate(s) received.")

    # ------------------------------------------------------------------
    # Step 1 & 2: Confirm entry eligibility
    # ------------------------------------------------------------------
    if not signal_candidates:
        log.step("no_candidates", "No Signal candidates. No decision to make.")
        return OrchestratorDecisionResult(
            event_id=event_id,
            decided=False,
            no_decision_reason="no_signal_candidates",
            log=log,
        )

    # Load the Event to get business_id and context
    event = await _load_event(db, event_id)
    if not event:
        log.step("event_not_found", f"Event not found: {event_id}")
        return OrchestratorDecisionResult(
            event_id=event_id,
            decided=False,
            no_decision_reason="event_not_found",
            log=log,
        )

    business_id = event["business_id"]
    log.step("event_loaded",
             f"Event loaded. business_id={business_id}, "
             f"event_type={event['event_type']}")

    # ------------------------------------------------------------------
    # Step 3: Load client orchestrator profile
    # ------------------------------------------------------------------
    client_profile = await _load_client_profile(db, business_id)
    if not client_profile:
        log.step("client_profile_not_found",
                 f"No client profile for business_id={business_id}. "
                 f"Using system defaults.")
        client_profile = _default_client_profile(business_id)
    else:
        log.step("client_profile_loaded",
                 f"Client profile loaded: "
                 f"automation_level={client_profile['automation_level']}, "
                 f"disabled_signals={client_profile.get('disabled_signal_ids', [])}")

    business_config = await _load_business_config(db, business_id)
    event_data = build_event_data(dict(event), dict(business_config or {}))

    # ------------------------------------------------------------------
    # Step 4: Load safety rules — applied first, cannot be overridden
    # ------------------------------------------------------------------
    safety_rules = await _load_safety_rules(db)
    log.step("safety_rules_loaded",
             f"{len(safety_rules)} safety rule(s) loaded. "
             f"These cannot be overridden by client configuration.")

    # ------------------------------------------------------------------
    # Step 5: Load consultant / account manager ownership parameters
    #
    # This is the new step. The consultant layer tells the Orchestrator:
    #   - Who manages this client account
    #   - Whether the consultant must review before client sees any action
    #   - What the approval route is
    #   - Who handles escalations
    #   - Whether the business owner is auto-notified
    #
    # First check if the dominant Signal already carries this context
    # from Section 1/2. If not, load it from business_configurations.
    # ------------------------------------------------------------------
    consultant_ownership = _extract_consultant_ownership_from_signals(
        signal_candidates
    )
    if not consultant_ownership:
        consultant_ownership = await _load_consultant_ownership(
            db, business_id
        )

    if consultant_ownership:
        log.step("consultant_ownership_loaded",
                 f"Consultant ownership loaded: "
                 f"consultant={consultant_ownership.get('consultant_name', 'unknown')}, "
                 f"primary_owner={consultant_ownership.get('primary_internal_owner')}, "
                 f"approval_route={consultant_ownership.get('approval_route')}, "
                 f"consultant_review_required="
                 f"{consultant_ownership.get('consultant_review_required')}")
    else:
        log.step("no_consultant_assigned",
                 "No consultant assigned to this business. "
                 "Routing will use business_owner as primary owner.")

    # Inject consultant ownership into event_data so condition evaluator
    # can reference it in orchestrator rules
    if consultant_ownership:
        event_data["consultant_ownership"] = consultant_ownership

    # ------------------------------------------------------------------
    # Step 6: Load client and global orchestrator rules
    # ------------------------------------------------------------------
    orc_rules = await _load_orchestrator_rules(db, business_id)
    log.step("orchestrator_rules_loaded",
             f"{len(orc_rules)} orchestrator rule(s) loaded "
             f"(client overrides merged with global defaults).")

    # ------------------------------------------------------------------
    # Step 6: Load signal-to-action mappings for this client
    # ------------------------------------------------------------------
    action_mappings = await _load_action_mappings(db, business_id, signal_candidates)
    log.step("action_mappings_loaded",
             f"Action mappings loaded for "
             f"{len(signal_candidates)} Signal(s).")

    # ------------------------------------------------------------------
    # Step 7: Apply disabled Signal filter from client profile
    # ------------------------------------------------------------------
    disabled_signals = client_profile.get("disabled_signal_ids") or []
    if isinstance(disabled_signals, str):
        try:
            disabled_signals = json.loads(disabled_signals)
        except json.JSONDecodeError:
            disabled_signals = []

    active_candidates = [
        c for c in signal_candidates
        if c.signal_rule_id not in disabled_signals
    ]

    if len(active_candidates) < len(signal_candidates):
        filtered = [
            c.signal_rule_id for c in signal_candidates
            if c.signal_rule_id in disabled_signals
        ]
        log.step("signals_disabled_by_client",
                 f"Client has disabled {len(filtered)} Signal(s): {filtered}")

    if not active_candidates:
        log.step("all_signals_disabled",
                 "All Signal candidates disabled by client profile. "
                 "No decision made.")
        return OrchestratorDecisionResult(
            event_id=event_id,
            decided=False,
            no_decision_reason="all_signals_disabled_by_client",
            log=log,
        )

    # ------------------------------------------------------------------
    # Step 8: Rank Signal candidates
    # ------------------------------------------------------------------
    ranked = _rank_signals(active_candidates)
    log.step("signals_ranked",
             f"Signals ranked: "
             f"{[f'{c.signal_name}(p={c.priority})' for c in ranked]}")

    # ------------------------------------------------------------------
    # Step 9: Identify dominant Signal
    # ------------------------------------------------------------------
    dominant = ranked[0]
    supporting = ranked[1:]

    log.step("dominant_signal_identified",
             f"Dominant Signal: {dominant.signal_name} "
             f"(bucket={dominant.signal_bucket}, "
             f"priority={dominant.priority}, "
             f"confidence={dominant.confidence_score})")

    if supporting:
        log.step("supporting_signals_identified",
                 f"Supporting Signals: "
                 f"{[c.signal_name for c in supporting]}")

    # ------------------------------------------------------------------
    # Step 10: Apply suppression rules from dominant Signal's orc rules
    # ------------------------------------------------------------------
    suppressed_signal_ids = []
    for rule in orc_rules:
        if rule.get("signal_rule_id") == dominant.signal_rule_id:
            suppress = rule.get("suppress_signals") or []
            if isinstance(suppress, str):
                try:
                    suppress = json.loads(suppress)
                except json.JSONDecodeError:
                    suppress = []
            suppressed_signal_ids.extend(suppress)

    if suppressed_signal_ids:
        log.step("signals_suppressed",
                 f"Suppressing Signals per orchestrator rules: "
                 f"{suppressed_signal_ids}")
        supporting = [
            c for c in supporting
            if c.signal_rule_id not in suppressed_signal_ids
        ]

    # Mark suppressed signals in database
    for sig_id in suppressed_signal_ids:
        await _suppress_signal(db, sig_id, event_id)

    # ------------------------------------------------------------------
    # Step 11: Select Actions via signal-to-action mappings
    # ------------------------------------------------------------------
    selected_actions = []
    blocked_actions  = []

    primary_mappings   = [
        m for m in action_mappings.get(dominant.signal_rule_id, [])
        if m["is_primary"]
    ]
    secondary_mappings = [
        m for m in action_mappings.get(dominant.signal_rule_id, [])
        if m["is_secondary"]
    ]

    all_mappings = primary_mappings + secondary_mappings

    if not all_mappings:
        log.step("no_action_mappings",
                 f"No action mappings found for Signal "
                 f"{dominant.signal_rule_id}. Cannot proceed.")
        return OrchestratorDecisionResult(
            event_id=event_id,
            decided=False,
            no_decision_reason="no_action_mappings_for_dominant_signal",
            dominant_signal=dominant,
            log=log,
        )

    log.step("actions_identified",
             f"{len(all_mappings)} action mapping(s) found for "
             f"{dominant.signal_name}: "
             f"{[m['action_id'] for m in all_mappings]}")

    # ------------------------------------------------------------------
    # Step 12: Apply client execution mode and owner overrides
    # ------------------------------------------------------------------
    domain_modes  = client_profile.get("domain_execution_modes") or {}
    domain_owners = client_profile.get("domain_owners") or {}

    if isinstance(domain_modes, str):
        try:
            domain_modes = json.loads(domain_modes)
        except json.JSONDecodeError:
            domain_modes = {}
    if isinstance(domain_owners, str):
        try:
            domain_owners = json.loads(domain_owners)
        except json.JSONDecodeError:
            domain_owners = {}

    automation_level = client_profile.get("automation_level", "standard")

    for mapping in all_mappings:
        action_id     = mapping["action_id"]
        action_detail = await _load_action(db, action_id)
        if not action_detail:
            log.step(f"action_not_found_{action_id}",
                     f"Action {action_id} not found in Action Library. Skipping.")
            continue

        action_domain    = action_detail["action_domain"]
        is_public_facing = action_detail["is_public_facing"]
        default_mode     = action_detail["default_execution_mode"]
        default_owner    = action_detail["default_owner"]

        # Determine execution mode — precedence order:
        #   1. Safety rule (always wins — applied in Step 13)
        #   2. Consultant review required (forces approval_required)
        #   3. Client-specific orchestrator rule override
        #   4. Client domain mode preference
        #   5. Automation level default
        #   6. Action Library default
        execution_mode = _resolve_execution_mode(
            action_id            = action_id,
            action_domain        = action_domain,
            is_public_facing     = is_public_facing,
            default_mode         = default_mode,
            domain_modes         = domain_modes,
            automation_level     = automation_level,
            orc_rules            = orc_rules,
            event_data           = event_data,
            signal_rule_id       = dominant.signal_rule_id,
            consultant_ownership = consultant_ownership,
        )

        # Determine owner — precedence order:
        #   1. Client-specific orchestrator rule override
        #   2. Consultant primary_internal_owner
        #   3. Client domain owner preference
        #   4. Action Library default
        owner = _resolve_owner(
            action_domain        = action_domain,
            default_owner        = default_owner,
            domain_owners        = domain_owners,
            orc_rules            = orc_rules,
            signal_rule_id       = dominant.signal_rule_id,
            consultant_ownership = consultant_ownership,
        )

        action_record = SelectedAction(
            action_id        = action_id,
            action_name      = action_detail["action_name"],
            action_domain    = action_domain,
            is_primary       = mapping["is_primary"],
            is_secondary     = mapping["is_secondary"],
            is_public_facing = is_public_facing,
            execution_mode   = execution_mode,
            owner            = owner,
        )

        selected_actions.append(action_record)
        log.step(
            f"action_selected_{action_id}",
            f"Action selected: {action_id} ({action_detail['action_name']}) | "
            f"mode={execution_mode} | owner={owner} | "
            f"public={is_public_facing}"
        )

    # ------------------------------------------------------------------
    # Step 13: Apply safety rules
    # Final pass — safety rules override any client or global setting
    # ------------------------------------------------------------------
    final_actions = []
    for action in selected_actions:
        blocked, block_reason = _check_safety_rules(
            action     = action,
            event_data = event_data,
            safety_rules = safety_rules,
        )
        if blocked:
            blocked_action = BlockedAction(
                action_id    = action.action_id,
                action_name  = action.action_name,
                block_reason = block_reason,
                blocked_by   = "safety_rule",
            )
            blocked_actions.append(blocked_action)
            log.step(
                f"action_blocked_{action.action_id}",
                f"Action {action.action_id} blocked by safety rule: "
                f"{block_reason}"
            )
        else:
            final_actions.append(action)

    if not final_actions:
        log.step("all_actions_blocked",
                 "All selected actions were blocked by safety rules.")

    # ------------------------------------------------------------------
    # Step 14: Create and store auditable decision record
    # ------------------------------------------------------------------
    decision_id = _generate_decision_id()

    decision_record = await _store_decision(
        db                   = db,
        decision_id          = decision_id,
        event_id             = event_id,
        dominant             = dominant,
        supporting           = supporting,
        final_actions        = final_actions,
        blocked_actions      = blocked_actions,
        business_config      = business_config,
        client_profile       = client_profile,
        consultant_ownership = consultant_ownership,
        log                  = log,
    )

    log.step("decision_stored",
             f"Decision stored: decision_id={decision_id}. "
             f"{len(final_actions)} action(s) ready for queue. "
             f"{len(blocked_actions)} action(s) blocked.")

    # ------------------------------------------------------------------
    # Step 15: Return decision to runner
    # ------------------------------------------------------------------
    return OrchestratorDecisionResult(
        event_id         = event_id,
        decided          = True,
        decision_id      = decision_id,
        dominant_signal  = dominant,
        supporting_signals = supporting,
        selected_actions = final_actions,
        blocked_actions  = blocked_actions,
        no_decision_reason = None,
        log              = log,
        decision_record  = decision_record,
    )


# ---------------------------------------------------------------------------
# Step 8: Signal ranking
# ---------------------------------------------------------------------------

def _rank_signals(candidates: list[SignalCandidate]) -> list[SignalCandidate]:
    """
    Rank Signal candidates to identify the dominant Signal.

    Ranking criteria (in order of precedence):
        1. Numeric priority (1 = highest, 5 = lowest)
        2. Bucket weight (Risk > Bottleneck > Opportunity > Performance >
                          Competitive > Momentum)
        3. Confidence score (higher confidence wins ties)

    The first Signal in the ranked list becomes the dominant Signal.
    """
    return sorted(
        candidates,
        key=lambda c: (
            c.priority or 3,
            BUCKET_WEIGHTS.get(c.signal_bucket, 9),
            -(c.confidence_score or 0),
        )
    )


# ---------------------------------------------------------------------------
# Step 12: Execution mode resolution
# ---------------------------------------------------------------------------

def _resolve_execution_mode(
    action_id:            str,
    action_domain:        str,
    is_public_facing:     bool,
    default_mode:         str,
    domain_modes:         dict,
    automation_level:     str,
    orc_rules:            list[dict],
    event_data:           dict,
    signal_rule_id:       str,
    consultant_ownership: dict | None = None,
) -> str:
    """
    Determine the execution mode for an action.

    Precedence (highest to lowest):
        1. Consultant review required (forces approval_required for
           any public-facing or client-visible action)
        2. Client orchestrator rule override for this signal
        3. Client domain mode preference
        4. Automation level default
        5. Action Library default

    Safety rules are applied separately in Step 13 and always win.
    """
    # 1. Consultant review required — forces approval on public-facing actions
    if consultant_ownership:
        if (consultant_ownership.get("consultant_review_required")
                and is_public_facing):
            return "approval_required"

    # 2. Check for client orchestrator rule override for this signal
    for rule in orc_rules:
        if (rule.get("signal_rule_id") == signal_rule_id
                and rule.get("execution_mode")
                and rule.get("scope") == "client"):
            conds = rule.get("conditions") or []
            if isinstance(conds, str):
                try:
                    conds = json.loads(conds)
                except json.JSONDecodeError:
                    conds = []
            if not conds:
                return rule["execution_mode"]
            from clearsky.engine.condition_evaluator import evaluate_conditions
            result = evaluate_conditions(conds, event_data)
            if result.passed:
                return rule["execution_mode"]

    # 3. Client domain mode preference
    if action_domain in domain_modes:
        return domain_modes[action_domain]

    # 4. Automation level defaults
    if automation_level == "conservative":
        return "approval_required"
    if automation_level == "aggressive":
        if is_public_facing:
            return "approval_required"  # Even aggressive requires public approval
        return "automatic"

    # 5. Standard: use action library default
    return default_mode


# ---------------------------------------------------------------------------
# Step 12: Owner resolution
# ---------------------------------------------------------------------------

def _resolve_owner(
    action_domain:        str,
    default_owner:        str,
    domain_owners:        dict,
    orc_rules:            list[dict],
    signal_rule_id:       str,
    consultant_ownership: dict | None = None,
) -> str:
    """
    Determine the owner for an action.

    Precedence (highest to lowest):
        1. Client-specific orchestrator rule override for this signal
        2. Consultant ownership — primary_internal_owner
        3. Client domain owner preference
        4. Action Library default
    """
    # 1. Client orchestrator rule override
    for rule in orc_rules:
        if (rule.get("signal_rule_id") == signal_rule_id
                and rule.get("owner")
                and rule.get("scope") == "client"):
            return rule["owner"]

    # 2. Consultant ownership — primary_internal_owner
    if consultant_ownership:
        primary_owner = consultant_ownership.get("primary_internal_owner")
        if primary_owner:
            return primary_owner

    # 3. Client domain owner preference
    if action_domain in domain_owners:
        return domain_owners[action_domain]

    # 4. Action Library default
    return default_owner or "system"


# ---------------------------------------------------------------------------
# Step 13: Safety rule evaluation
# ---------------------------------------------------------------------------

def _check_safety_rules(
    action:       "SelectedAction",
    event_data:   dict,
    safety_rules: list[dict],
) -> tuple[bool, str | None]:
    """
    Check whether a selected action is blocked by any safety rule.

    Safety rules are global, non-negotiable, and cannot be overridden
    by client configuration.

    Returns (is_blocked, block_reason).
    """
    # Inject action context into event_data for condition evaluation
    check_data = {
        **event_data,
        "action_id":           action.action_id,
        "action_is_public_facing": action.is_public_facing,
        "execution_mode":      action.execution_mode,
    }

    for rule in safety_rules:
        conditions = rule.get("conditions") or []
        if isinstance(conditions, str):
            try:
                conditions = json.loads(conditions)
            except json.JSONDecodeError:
                conditions = []

        result = evaluate_conditions(conditions, check_data)
        if result.passed:
            return True, rule.get("block_reason", "Blocked by safety rule.")

    return False, None


# ---------------------------------------------------------------------------
# Database loaders
# ---------------------------------------------------------------------------

async def _load_event(
    db: asyncpg.Connection,
    event_id: str,
) -> dict | None:
    row = await db.fetchrow(
        """
        SELECT event_id, event_type, network_category, business_id,
               rating, review_text, reviewer_name,
               rating_content_mismatch, ai_context, ai_confidence_score,
               business_matched, handoff_eligible, processing_status,
               normalized_payload
        FROM events
        WHERE event_id = $1
        """,
        event_id
    )
    if not row:
        return None
    event = dict(row)
    if event.get("ai_context") and isinstance(event["ai_context"], str):
        try:
            event["ai_context"] = json.loads(event["ai_context"])
        except json.JSONDecodeError:
            event["ai_context"] = {}
    return event


async def _load_client_profile(
    db: asyncpg.Connection,
    business_id: str,
) -> dict | None:
    row = await db.fetchrow(
        """
        SELECT business_id, profile_name, automation_level,
               allowed_action_domains, disabled_signal_ids,
               domain_execution_modes, domain_owners,
               has_consultant, consultant_email,
               notify_owner_on_escalation, notify_owner_on_draft,
               notify_owner_on_auto, preferred_reply_length,
               include_business_name, include_call_to_action
        FROM client_orchestrator_profiles
        WHERE business_id = $1 AND active = TRUE
        """,
        business_id
    )
    return dict(row) if row else None


def _default_client_profile(business_id: str) -> dict:
    """Default profile when no client profile exists."""
    return {
        "business_id":             business_id,
        "automation_level":        "standard",
        "disabled_signal_ids":     [],
        "domain_execution_modes":  {},
        "domain_owners":           {},
        "preferred_reply_length":  "medium",
        "include_business_name":   True,
        "include_call_to_action":  False,
    }


async def _load_business_config(
    db: asyncpg.Connection,
    business_id: str,
) -> dict | None:
    row = await db.fetchrow(
        """
        SELECT business_id, business_name, automation_level,
               review_reply_policy, public_response_requires_approval,
               sms_requires_approval, email_requires_approval,
               brand_tone, sla_response_hours, office_timezone
        FROM business_configurations
        WHERE business_id = $1 AND active = TRUE
        """,
        business_id
    )
    return dict(row) if row else None


async def _load_safety_rules(db: asyncpg.Connection) -> list[dict]:
    """
    Load all active safety compliance rules.
    These are global and non-negotiable.
    """
    rows = await db.fetch(
        """
        SELECT rule_id, rule_name, conditions, block_reason, severity
        FROM safety_compliance_rules
        WHERE active = TRUE
        ORDER BY severity DESC
        """
    )
    return [dict(row) for row in rows]


def _extract_consultant_ownership_from_signals(
    signal_candidates: list,
) -> dict | None:
    """
    Extract consultant ownership context from Signal candidates.
    Section 1 loads this context and Section 2 attaches it to each
    Signal candidate. The Orchestrator reads it from the first candidate
    that has it rather than reloading from the database.
    """
    for candidate in signal_candidates:
        ctx = getattr(candidate, "business_mgmt_context", None)
        if ctx:
            return ctx
    return None


async def _load_consultant_ownership(
    db: asyncpg.Connection,
    business_id: str,
) -> dict | None:
    """
    Load consultant ownership context directly from business_configurations.
    Used as fallback when Signal candidates do not carry the context.
    """
    row = await db.fetchrow(
        """
        SELECT
            consultant_id, consultant_name, consultant_email,
            consultant_role, primary_internal_owner,
            default_escalation_owner, client_notification_mode,
            approval_route, consultant_review_required,
            auto_notify_consultant, auto_notify_business_owner,
            after_hours_escalation_owner,
            business_owner_id, business_owner_name, business_owner_email
        FROM business_configurations
        WHERE business_id = $1
          AND active = TRUE
          AND consultant_id IS NOT NULL
        """,
        business_id
    )
    if not row:
        return None
    return dict(row)


async def _load_orchestrator_rules(
    db: asyncpg.Connection,
    business_id: str,
) -> list[dict]:
    """
    Load orchestrator rules for this client.

    Loads global defaults (business_id IS NULL) and client overrides
    (business_id = client). Client overrides are marked scope='client'.

    Returns merged list — client rules listed first so they take
    precedence in resolution logic.
    """
    rows = await db.fetch(
        """
        SELECT rule_id, rule_name, business_id, scope,
               signal_rule_id, conditions, execution_mode,
               owner, priority_override, suppress_signals,
               block_reason, is_safety_rule
        FROM orchestrator_rules
        WHERE active = TRUE
          AND is_safety_rule = FALSE
          AND (business_id IS NULL OR business_id = $1)
        ORDER BY
            CASE WHEN business_id = $1 THEN 0 ELSE 1 END ASC,
            id ASC
        """,
        business_id
    )
    return [dict(row) for row in rows]


async def _load_action_mappings(
    db: asyncpg.Connection,
    business_id: str,
    candidates: list[SignalCandidate],
) -> dict[str, list[dict]]:
    """
    Load signal-to-action mappings for all candidate signal_rule_ids.

    Multi-tenant: loads client mappings first, then global defaults.
    If a client has their own mappings for a Signal, global mappings
    for that Signal are not used.

    Returns dict keyed by signal_rule_id.
    """
    signal_ids = [c.signal_rule_id for c in candidates]
    if not signal_ids:
        return {}

    rows = await db.fetch(
        """
        SELECT signal_rule_id, action_id, business_id,
               is_primary, is_secondary
        FROM signal_action_mappings
        WHERE signal_rule_id = ANY($1::text[])
          AND active = TRUE
          AND (business_id IS NULL OR business_id = $2)
        ORDER BY
            signal_rule_id,
            CASE WHEN business_id = $2 THEN 0 ELSE 1 END ASC,
            is_primary DESC
        """,
        signal_ids, business_id
    )

    mappings: dict[str, list[dict]] = {}
    seen_client_signals: set[str] = set()

    for row in rows:
        sig_id = row["signal_rule_id"]
        biz_id = row["business_id"]

        # If client has mappings for this signal, skip global mappings
        if biz_id == business_id:
            seen_client_signals.add(sig_id)
            mappings.setdefault(sig_id, []).append(dict(row))
        elif sig_id not in seen_client_signals:
            mappings.setdefault(sig_id, []).append(dict(row))

    return mappings


async def _load_action(
    db: asyncpg.Connection,
    action_id: str,
) -> dict | None:
    row = await db.fetchrow(
        """
        SELECT action_id, action_name, action_domain,
               default_execution_mode, default_owner,
               required_parameters, optional_parameters,
               calls_a2p, is_public_facing
        FROM action_library
        WHERE action_id = $1 AND active = TRUE
        """,
        action_id
    )
    return dict(row) if row else None


# ---------------------------------------------------------------------------
# Signal suppression
# ---------------------------------------------------------------------------

async def _suppress_signal(
    db: asyncpg.Connection,
    signal_rule_id: str,
    event_id: str,
) -> None:
    """Mark Signal candidates as suppressed in the database."""
    await db.execute(
        """
        UPDATE signal_events
        SET status = 'suppressed'
        WHERE signal_rule_id = $1
          AND event_id = $2
          AND status = 'candidate'
        """,
        signal_rule_id, event_id
    )


# ---------------------------------------------------------------------------
# Decision storage
# ---------------------------------------------------------------------------

async def _store_decision(
    db:                   asyncpg.Connection,
    decision_id:          str,
    event_id:             str,
    dominant:             SignalCandidate,
    supporting:           list[SignalCandidate],
    final_actions:        list["SelectedAction"],
    blocked_actions:      list["BlockedAction"],
    business_config:      dict | None,
    client_profile:       dict,
    consultant_ownership: dict | None,
    log:                  "OrchestratorLog",
) -> dict:
    """Store the auditable Orchestrator Decision record."""

    # Determine overall execution mode from primary action
    primary_action = next(
        (a for a in final_actions if a.is_primary), None
    ) or (final_actions[0] if final_actions else None)

    execution_mode = primary_action.execution_mode if primary_action else "blocked"
    owner          = primary_action.owner if primary_action else None
    priority       = dominant.priority

    # Consultant fields for the decision record
    consultant_review_required = False
    consultant_id              = None
    approval_route             = None
    if consultant_ownership:
        consultant_review_required = consultant_ownership.get(
            "consultant_review_required", False
        )
        consultant_id  = consultant_ownership.get("consultant_id")
        approval_route = consultant_ownership.get("approval_route")

    # Build reason string
    reason = (
        f"Dominant Signal: {dominant.signal_name} "
        f"(bucket={dominant.signal_bucket}, "
        f"priority={dominant.priority}). "
        f"Automation level: {client_profile.get('automation_level', 'standard')}. "
        f"Consultant review required: {consultant_review_required}. "
        f"Approval route: {approval_route or 'default'}. "
        f"{len(final_actions)} action(s) selected. "
        f"{len(blocked_actions)} action(s) blocked by safety rules."
    )

    created_at = datetime.now(timezone.utc)

    await db.execute(
        """
        INSERT INTO orchestrator_decisions (
            decision_id, event_id,
            dominant_signal_id, supporting_signal_ids,
            selected_action_ids, blocked_action_ids,
            execution_mode, owner, priority, reason,
            business_config_snapshot,
            safety_checks_passed,
            consultant_review_required,
            consultant_id,
            approval_route,
            created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        """,
        decision_id,
        event_id,
        dominant.signal_event_id,
        json.dumps([c.signal_event_id for c in supporting]),
        json.dumps([a.action_id for a in final_actions]),
        json.dumps([
            {"action_id": b.action_id, "reason": b.block_reason}
            for b in blocked_actions
        ]),
        execution_mode,
        owner,
        priority,
        reason,
        json.dumps(dict(business_config) if business_config else {}),
        len(blocked_actions) > 0 or len(final_actions) > 0,
        consultant_review_required,
        consultant_id,
        approval_route,
        created_at,
    )

    # Mark dominant signal as valid
    await db.execute(
        """
        UPDATE signal_events
        SET status = 'valid'
        WHERE signal_event_id = $1
        """,
        dominant.signal_event_id
    )

    return {
        "decision_id":                decision_id,
        "event_id":                   event_id,
        "dominant_signal":            dominant.signal_name,
        "execution_mode":             execution_mode,
        "owner":                      owner,
        "selected_actions":           [a.action_id for a in final_actions],
        "blocked_actions":            [b.action_id for b in blocked_actions],
        "consultant_review_required": consultant_review_required,
        "consultant_id":              consultant_id,
        "approval_route":             approval_route,
        "reason":                     reason,
        "created_at":                 created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# ID generator
# ---------------------------------------------------------------------------

def _generate_decision_id() -> str:
    return f"dec_{uuid.uuid4().hex[:10]}"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

class SelectedAction:
    """An action selected by the Orchestrator for this decision."""

    def __init__(
        self,
        action_id:        str,
        action_name:      str,
        action_domain:    str,
        is_primary:       bool,
        is_secondary:     bool,
        is_public_facing: bool,
        execution_mode:   str,
        owner:            str,
    ):
        self.action_id        = action_id
        self.action_name      = action_name
        self.action_domain    = action_domain
        self.is_primary       = is_primary
        self.is_secondary     = is_secondary
        self.is_public_facing = is_public_facing
        self.execution_mode   = execution_mode
        self.owner            = owner

    def to_dict(self) -> dict:
        return {
            "action_id":        self.action_id,
            "action_name":      self.action_name,
            "action_domain":    self.action_domain,
            "is_primary":       self.is_primary,
            "is_secondary":     self.is_secondary,
            "is_public_facing": self.is_public_facing,
            "execution_mode":   self.execution_mode,
            "owner":            self.owner,
        }


class BlockedAction:
    """An action that was blocked by a safety rule."""

    def __init__(
        self,
        action_id:    str,
        action_name:  str,
        block_reason: str,
        blocked_by:   str,
    ):
        self.action_id    = action_id
        self.action_name  = action_name
        self.block_reason = block_reason
        self.blocked_by   = blocked_by

    def to_dict(self) -> dict:
        return {
            "action_id":    self.action_id,
            "action_name":  self.action_name,
            "block_reason": self.block_reason,
            "blocked_by":   self.blocked_by,
        }


class OrchestratorDecisionResult:
    """
    The result of the Orchestrator Decision for one Event.
    Passed to the runner which feeds it to Section 4 Action Queue.

    If decided = False, no actions will be queued.
    The reason is recorded for audit.
    """

    def __init__(
        self,
        event_id:            str,
        decided:             bool,
        decision_id:         str | None = None,
        dominant_signal:     SignalCandidate | None = None,
        supporting_signals:  list[SignalCandidate] | None = None,
        selected_actions:    list[SelectedAction] | None = None,
        blocked_actions:     list[BlockedAction] | None = None,
        no_decision_reason:  str | None = None,
        log:                 "OrchestratorLog | None" = None,
        decision_record:     dict | None = None,
    ):
        self.event_id           = event_id
        self.decided            = decided
        self.decision_id        = decision_id
        self.dominant_signal    = dominant_signal
        self.supporting_signals = supporting_signals or []
        self.selected_actions   = selected_actions or []
        self.blocked_actions    = blocked_actions or []
        self.no_decision_reason = no_decision_reason
        self.log                = log
        self.decision_record    = decision_record

    def to_dict(self) -> dict:
        return {
            "event_id":           self.event_id,
            "decided":            self.decided,
            "decision_id":        self.decision_id,
            "dominant_signal":    self.dominant_signal.to_dict()
                                  if self.dominant_signal else None,
            "supporting_signals": [s.to_dict() for s in self.supporting_signals],
            "selected_actions":   [a.to_dict() for a in self.selected_actions],
            "blocked_actions":    [b.to_dict() for b in self.blocked_actions],
            "no_decision_reason": self.no_decision_reason,
            "log":                self.log.to_dict() if self.log else None,
        }


class OrchestratorLog:
    """Collects processing steps for the Orchestrator audit trail."""

    def __init__(self, event_id: str):
        self.event_id = event_id
        self.steps: list[dict] = []

    def step(self, status: str, message: str) -> None:
        self.steps.append({"status": status, "message": message})
        logger.debug("[orchestrator:%s] %s: %s",
                     self.event_id, status, message)

    def to_dict(self) -> dict:
        return {"event_id": self.event_id, "steps": self.steps}
