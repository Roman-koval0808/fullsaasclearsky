"""
ClearSky AI Decision System
Engine Runner
=============
Chains Sections 1 through 3 in sequence for a single provider payload.

The runner is the entry point called by the API route when a webhook
arrives. It receives the raw provider payload, runs it through the
seven-section pipeline, and returns a structured result the API
can use to update the cockpit and notify the business owner.

Current coverage: Sections 1, 2, and 3.
Sections 4-7 will be added as they are built.

Flow:
    Raw payload
        -> Section 1: Event Intake
            -> handoff_eligible?
                NO  -> store blocked event, return result
                YES -> Section 2: Signal Detection
                    -> has_signals?
                        NO  -> store no-signal result, return result
                        YES -> Section 3: Orchestrator Decision
                            -> decided?
                                NO  -> store no-decision result, return result
                                YES -> return decision result
                                       (Section 4 Queue picks up from here)
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Any

import asyncpg

from clearsky.engine.section_1_event import (
    process_raw_input,
    EventIntakeResult,
)
from clearsky.engine.section_2_signal import (
    detect_signals,
    SignalDetectionResult,
)
from clearsky.engine.section_3_orchestrator import (
    make_decision,
    OrchestratorDecisionResult,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Runner result
# ---------------------------------------------------------------------------

@dataclass
class RunnerResult:
    """
    The complete result of running a payload through the pipeline.
    Returned to the API route after the runner completes.
    """
    # Section 1
    intake:           EventIntakeResult | None = None

    # Section 2
    signal_detection: SignalDetectionResult | None = None

    # Section 3
    decision:         OrchestratorDecisionResult | None = None

    # Overall status
    pipeline_status:  str = "not_started"
    stopped_at:       str | None = None
    stop_reason:      str | None = None

    def to_dict(self) -> dict:
        return {
            "pipeline_status":  self.pipeline_status,
            "stopped_at":       self.stopped_at,
            "stop_reason":      self.stop_reason,
            "intake":           self.intake.to_dict() if self.intake else None,
            "signal_detection": self.signal_detection.to_dict()
                                 if self.signal_detection else None,
            "decision":         self.decision.to_dict()
                                 if self.decision else None,
        }

    @property
    def event_id(self) -> str | None:
        return self.intake.event_id if self.intake else None

    @property
    def handoff_eligible(self) -> bool:
        return self.intake.handoff_eligible if self.intake else False

    @property
    def has_signals(self) -> bool:
        return (
            self.signal_detection.has_signals
            if self.signal_detection else False
        )

    @property
    def has_decision(self) -> bool:
        return self.decision.decided if self.decision else False


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def run_pipeline(
    raw_payload: dict,
    db: asyncpg.Connection,
) -> RunnerResult:
    """
    Run the ClearSky pipeline for a single raw provider payload.

    Args:
        raw_payload:  The raw payload from the provider webhook.
        db:           Active database connection.

    Returns:
        RunnerResult with results from each section that ran.
    """
    result = RunnerResult(pipeline_status="running")

    # Read environment config
    ai_mock_mode = os.environ.get("AI_MOCK_MODE", "false").lower() == "true"
    ai_threshold = float(os.environ.get("AI_CONFIDENCE_THRESHOLD", "0.75"))
    default_biz  = os.environ.get("BUSINESS_ID_DEFAULT", "biz_apex_001")

    logger.info("[Runner] Pipeline started. mock_mode=%s", ai_mock_mode)

    # ------------------------------------------------------------------
    # Section 1: Event Intake
    # ------------------------------------------------------------------
    try:
        intake = await process_raw_input(
            raw_payload             = raw_payload,
            db                      = db,
            ai_mock_mode            = ai_mock_mode,
            ai_confidence_threshold = ai_threshold,
            default_business_id     = default_biz,
        )
        result.intake = intake

        logger.info(
            "[Runner] Section 1 complete. event_id=%s, "
            "handoff_eligible=%s, status=%s",
            intake.event_id,
            intake.handoff_eligible,
            intake.processing_status,
        )

        if not intake.handoff_eligible:
            result.pipeline_status = "stopped"
            result.stopped_at      = "section_1"
            result.stop_reason     = (
                f"Event not handoff eligible. "
                f"Status: {intake.processing_status}. "
                f"Duplicate: {intake.is_duplicate}."
            )
            logger.info(
                "[Runner] Pipeline stopped at Section 1. reason=%s",
                result.stop_reason
            )
            return result

    except Exception as e:
        logger.error("[Runner] Section 1 failed: %s", e, exc_info=True)
        result.pipeline_status = "error"
        result.stopped_at      = "section_1"
        result.stop_reason     = f"Section 1 exception: {e}"
        return result

    # ------------------------------------------------------------------
    # Section 2: Signal Detection
    # ------------------------------------------------------------------
    try:
        signal_detection = await detect_signals(
            event_id = intake.event_id,
            db       = db,
        )
        result.signal_detection = signal_detection

        logger.info(
            "[Runner] Section 2 complete. event_id=%s, "
            "has_signals=%s, signal_count=%d",
            intake.event_id,
            signal_detection.has_signals,
            len(signal_detection.signal_candidates),
        )

        if not signal_detection.has_signals:
            result.pipeline_status = "completed_no_signal"
            result.stopped_at      = "section_2"
            result.stop_reason     = (
                f"No Signal fired. "
                f"Reason: {signal_detection.no_signal_reason}"
            )
            logger.info(
                "[Runner] No Signal fired. reason=%s",
                signal_detection.no_signal_reason
            )
            return result

    except Exception as e:
        logger.error("[Runner] Section 2 failed: %s", e, exc_info=True)
        result.pipeline_status = "error"
        result.stopped_at      = "section_2"
        result.stop_reason     = f"Section 2 exception: {e}"
        return result

    # ------------------------------------------------------------------
    # Section 3: Orchestrator Decision
    # ------------------------------------------------------------------
    try:
        decision = await make_decision(
            event_id          = intake.event_id,
            signal_candidates = signal_detection.signal_candidates,
            db                = db,
        )
        result.decision = decision

        logger.info(
            "[Runner] Section 3 complete. event_id=%s, "
            "decided=%s, decision_id=%s, "
            "actions=%d, blocked=%d",
            intake.event_id,
            decision.decided,
            decision.decision_id,
            len(decision.selected_actions),
            len(decision.blocked_actions),
        )

        if not decision.decided:
            result.pipeline_status = "completed_no_decision"
            result.stopped_at      = "section_3"
            result.stop_reason     = (
                f"Orchestrator made no decision. "
                f"Reason: {decision.no_decision_reason}"
            )
            return result

        # Sections 4-7 will be called here as they are built
        result.pipeline_status = "decision_ready"
        logger.info(
            "[Runner] Pipeline completed through Section 3. "
            "decision_id=%s ready for Section 4 queue.",
            decision.decision_id
        )

    except Exception as e:
        logger.error("[Runner] Section 3 failed: %s", e, exc_info=True)
        result.pipeline_status = "error"
        result.stopped_at      = "section_3"
        result.stop_reason     = f"Section 3 exception: {e}"
        return result

    return result
