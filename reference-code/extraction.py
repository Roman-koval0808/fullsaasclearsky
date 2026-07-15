"""
ClearSky AI Decision System
AI Context Extraction
=====================
Calls the Anthropic Claude API to extract structured context from
unstructured provider content — review text, SMS messages, voicemail
transcripts, form submissions, and similar free-text fields.

AI extraction runs ONLY when the Provider Event Registry flags
requires_ai_extraction = true for the incoming event type.

AI does NOT:
    - Assign event_type
    - Assign Network Category
    - Make Orchestrator decisions
    - Select Actions
    - Determine handoff eligibility

AI DOES:
    - Extract intent, sentiment, urgency, service mentioned
    - Identify complaint topics and praise topics
    - Detect legal threat language
    - Summarize unstructured content
    - Return a confidence score

The structured output from AI becomes ai_context on the Event Object.
Signal rules then use ai_context fields as evidence — not as decisions.

Mock mode:
    Set AI_MOCK_MODE=true in .env to skip real API calls.
    Mock mode returns realistic pre-built extraction results based on
    the event type and key content signals. Useful for testing Signal
    rules and Orchestrator logic without consuming API tokens.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Result object
# ---------------------------------------------------------------------------

@dataclass
class ExtractionResult:
    """
    Structured result from AI context extraction.

    context:          The extracted fields as a dict. Stored as
                      ai_context on the Event Object.
    confidence_score: Float 0.0-1.0. How confident the AI is in
                      the extraction. Used by Signal rules as a
                      threshold gate.
    mock_mode:        True if this result came from mock mode.
    """
    context:          dict
    confidence_score: float
    mock_mode:        bool = False

# Keep backward compat alias
MockExtractionResult = ExtractionResult


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def extract_ai_context(
    event_type:  str,
    raw_payload: dict,
    normalized:  dict,
    mock_mode:   bool = False,
) -> ExtractionResult:
    """
    Extract structured AI context from unstructured event content.

    Args:
        event_type:   The ClearSky event_type (e.g. review_received).
        raw_payload:  The original provider payload.
        normalized:   The normalized fields from Section 1.
        mock_mode:    If True, returns mock data without calling the API.

    Returns:
        ExtractionResult with context dict and confidence score.
    """
    if mock_mode:
        logger.info("[AI] Mock mode active. Returning mock extraction.")
        return _mock_extraction(event_type, normalized)

    # Route to the correct extraction prompt by event type
    prompt_fn = EXTRACTION_PROMPTS.get(event_type)
    if not prompt_fn:
        logger.warning(
            "[AI] No extraction prompt for event_type=%s. "
            "Returning empty context.", event_type
        )
        return ExtractionResult(context={}, confidence_score=0.0)

    prompt = prompt_fn(raw_payload, normalized)
    return await _call_claude(prompt)


# ---------------------------------------------------------------------------
# Claude API call
# ---------------------------------------------------------------------------

async def _call_claude(prompt: str) -> ExtractionResult:
    """
    Call the Anthropic Claude API with the extraction prompt.
    Returns structured JSON parsed into an ExtractionResult.
    """
    try:
        import anthropic
        client = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        raw_text = message.content[0].text.strip()

        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            raw_text = "\n".join(lines[1:-1])

        context = json.loads(raw_text)

        confidence_score = float(context.get("confidence_score", 0.0))
        confidence_score = max(0.0, min(1.0, confidence_score))

        logger.info(
            "[AI] Extraction complete. confidence=%.2f", confidence_score
        )

        return ExtractionResult(
            context=context,
            confidence_score=confidence_score,
            mock_mode=False,
        )

    except json.JSONDecodeError as e:
        logger.error("[AI] Failed to parse Claude response as JSON: %s", e)
        return ExtractionResult(context={}, confidence_score=0.0)
    except Exception as e:
        logger.error("[AI] Claude API call failed: %s", e)
        raise


# ---------------------------------------------------------------------------
# Extraction prompts by event type
# ---------------------------------------------------------------------------

def _prompt_review_received(raw_payload: dict, normalized: dict) -> str:
    review_text = (
        normalized.get("review_text") or
        raw_payload.get("review_text") or
        raw_payload.get("comment") or ""
    )
    rating = normalized.get("rating") or raw_payload.get("rating", "unknown")

    return f"""You are a structured data extraction assistant for a business intelligence platform.

A customer has posted a Google Business Profile review. Extract structured information from it.

Star Rating: {rating}
Review Text: {review_text}

Return ONLY a valid JSON object with exactly these fields. No explanation, no markdown, no preamble.

{{
    "intent": "provide_feedback | complaint | praise | question | warning | other",
    "sentiment": "positive | negative | mixed | neutral",
    "urgency_level": "urgent | normal | low",
    "service_mentioned": "the specific service mentioned or null",
    "complaint_topics": ["list", "of", "complaint", "topics", "or", "empty", "array"],
    "praise_topics": ["list", "of", "praise", "topics", "or", "empty", "array"],
    "legal_threat": true or false,
    "profanity_detected": true or false,
    "summary": "one sentence summary of the review content",
    "confidence_score": 0.0 to 1.0
}}

Rules:
- complaint_topics: include specific issues like "slow communication", "no follow-up", "poor quality", "pricing"
- praise_topics: include specific positives like "professional crew", "clean work", "on time", "good value"
- legal_threat: true only if review explicitly mentions lawyers, lawsuits, courts, or legal action
- confidence_score: how confident you are in the extraction. Lower if text is vague, very short, or ambiguous.
- Return only the JSON object. Nothing else."""


def _prompt_inbound_sms(raw_payload: dict, normalized: dict) -> str:
    sms_text = (
        normalized.get("sms_text") or
        raw_payload.get("text") or
        raw_payload.get("body") or ""
    )

    return f"""You are a structured data extraction assistant for a business intelligence platform.

An inbound SMS was received by a local trades business. Extract structured information.

SMS Text: {sms_text}

Return ONLY a valid JSON object with exactly these fields. No explanation, no markdown.

{{
    "intent": "request_quote | request_service | follow_up | complaint | general_inquiry | spam | other",
    "sentiment": "positive | negative | neutral | urgent",
    "urgency_level": "urgent | normal | low",
    "service_requested": "the specific service requested or null",
    "problem_type": "brief description of the problem or null",
    "timeline": "today | this_week | flexible | unknown",
    "summary": "one sentence summary",
    "confidence_score": 0.0 to 1.0
}}

Return only the JSON object. Nothing else."""


def _prompt_voicemail(raw_payload: dict, normalized: dict) -> str:
    transcript = (
        normalized.get("transcript_text") or
        raw_payload.get("transcript") or
        raw_payload.get("transcript_text") or ""
    )

    return f"""You are a structured data extraction assistant for a business intelligence platform.

A voicemail transcript was received by a local trades business. Extract structured information.

Transcript: {transcript}

Return ONLY a valid JSON object with exactly these fields. No explanation, no markdown.

{{
    "intent": "request_quote | request_service | follow_up | complaint | callback_request | other",
    "sentiment": "positive | negative | neutral | frustrated",
    "urgency_level": "urgent | normal | low",
    "service_requested": "the specific service or null",
    "problem_type": "brief description of the problem or null",
    "caller_name": "caller name if mentioned or null",
    "callback_requested": true or false,
    "timeline": "today | this_week | flexible | unknown",
    "summary": "one sentence summary",
    "confidence_score": 0.0 to 1.0
}}

Return only the JSON object. Nothing else."""


def _prompt_lead_form(raw_payload: dict, normalized: dict) -> str:
    message = (
        normalized.get("message_text") or
        raw_payload.get("message") or ""
    )
    service_page = normalized.get("source_page") or ""

    return f"""You are a structured data extraction assistant for a business intelligence platform.

A lead form was submitted on a local trades business website. Extract structured information.

Message: {message}
Source Page: {service_page}

Return ONLY a valid JSON object with exactly these fields. No explanation, no markdown.

{{
    "intent": "request_quote | request_service | request_info | emergency | other",
    "sentiment": "positive | neutral | urgent | concerned",
    "urgency_level": "urgent | normal | low",
    "service_requested": "the specific service or null",
    "problem_type": "brief description of the problem or null",
    "timeline": "today | this_week | flexible | unknown",
    "summary": "one sentence summary",
    "confidence_score": 0.0 to 1.0
}}

Return only the JSON object. Nothing else."""


def _prompt_social_comment(raw_payload: dict, normalized: dict) -> str:
    comment_text = (
        raw_payload.get("comment_text") or
        raw_payload.get("text") or ""
    )
    platform = raw_payload.get("platform", "unknown")

    return f"""You are a structured data extraction assistant for a business intelligence platform.

A comment was received on a social media post for a local trades business.

Platform: {platform}
Comment: {comment_text}

Return ONLY a valid JSON object with exactly these fields. No explanation, no markdown.

{{
    "intent": "praise | complaint | question | spam | inquiry | other",
    "sentiment": "positive | negative | neutral | mixed",
    "urgency_level": "urgent | normal | low",
    "service_mentioned": "the specific service or null",
    "summary": "one sentence summary",
    "confidence_score": 0.0 to 1.0
}}

Return only the JSON object. Nothing else."""


# ---------------------------------------------------------------------------
# Prompt dispatch table
# ---------------------------------------------------------------------------

EXTRACTION_PROMPTS = {
    "review_received":        _prompt_review_received,
    "review_updated":         _prompt_review_received,
    "inbound_sms":            _prompt_inbound_sms,
    "voicemail_received":     _prompt_voicemail,
    "call_transcript_available": _prompt_voicemail,
    "lead_form_submitted":    _prompt_lead_form,
    "social_comment_received": _prompt_social_comment,
    "social_dm_received":     _prompt_inbound_sms,
    "social_mention_detected": _prompt_social_comment,
}


# ---------------------------------------------------------------------------
# Mock extraction
# ---------------------------------------------------------------------------

def _mock_extraction(event_type: str, normalized: dict) -> ExtractionResult:
    """
    Return realistic mock AI extraction results for testing.

    Mock results are based on event type and key normalized fields
    so they produce meaningful Signal rule evaluations without
    consuming API tokens.
    """
    if event_type in ("review_received", "review_updated"):
        return _mock_review(normalized)
    if event_type == "inbound_sms":
        return _mock_sms(normalized)
    if event_type in ("voicemail_received", "call_transcript_available"):
        return _mock_voicemail()
    if event_type == "lead_form_submitted":
        return _mock_lead_form(normalized)

    # Generic fallback
    return ExtractionResult(
        context={
            "intent":          "other",
            "sentiment":       "neutral",
            "urgency_level":   "normal",
            "summary":         "Mock extraction for event type: " + event_type,
            "confidence_score": 0.85,
        },
        confidence_score=0.85,
        mock_mode=True,
    )


def _mock_review(normalized: dict) -> ExtractionResult:
    """
    Mock extraction for GBP reviews.
    Varies the response based on the star rating so Signal rules
    fire correctly during testing.
    """
    rating = normalized.get("rating") or 4

    if rating >= 4:
        context = {
            "intent":            "provide_feedback",
            "sentiment":         "mixed" if rating == 4 else "positive",
            "urgency_level":     "normal",
            "service_mentioned": "roof repair",
            "complaint_topics":  ["slow communication before appointment"]
                                  if rating == 4 else [],
            "praise_topics":     ["professional crew", "good quality work"],
            "legal_threat":      False,
            "profanity_detected": False,
            "summary":           "Customer praised the work quality but noted "
                                 "slow communication before the appointment."
                                 if rating == 4 else
                                 "Customer left a glowing five star review "
                                 "praising the crew and quality of work.",
            "confidence_score":  0.92,
        }
    elif rating == 3:
        context = {
            "intent":            "provide_feedback",
            "sentiment":         "mixed",
            "urgency_level":     "normal",
            "service_mentioned": None,
            "complaint_topics":  [],
            "praise_topics":     [],
            "legal_threat":      False,
            "profanity_detected": False,
            "summary":           "Ambiguous review with limited detail.",
            "confidence_score":  0.55,
        }
    elif rating == 2:
        context = {
            "intent":            "complaint",
            "sentiment":         "negative",
            "urgency_level":     "normal",
            "service_mentioned": "general contracting",
            "complaint_topics":  ["poor quality", "no follow-up"],
            "praise_topics":     [],
            "legal_threat":      False,
            "profanity_detected": False,
            "summary":           "Customer is dissatisfied with quality "
                                 "and lack of follow-up.",
            "confidence_score":  0.88,
        }
    else:  # rating == 1
        context = {
            "intent":            "complaint",
            "sentiment":         "negative",
            "urgency_level":     "urgent",
            "service_mentioned": "general contracting",
            "complaint_topics":  ["poor quality", "no communication",
                                  "incomplete work"],
            "praise_topics":     [],
            "legal_threat":      False,
            "profanity_detected": False,
            "summary":           "Very unhappy customer citing poor quality, "
                                 "communication failures, and incomplete work.",
            "confidence_score":  0.90,
        }

    return ExtractionResult(
        context=context,
        confidence_score=context["confidence_score"],
        mock_mode=True,
    )


def _mock_sms(normalized: dict) -> ExtractionResult:
    context = {
        "intent":           "request_service",
        "sentiment":        "neutral",
        "urgency_level":    "normal",
        "service_requested": "roofing",
        "problem_type":     "potential leak",
        "timeline":         "this_week",
        "summary":          "Customer inquiring about roofing service "
                            "for a potential leak.",
        "confidence_score": 0.87,
    }
    return ExtractionResult(
        context=context,
        confidence_score=context["confidence_score"],
        mock_mode=True,
    )


def _mock_voicemail() -> ExtractionResult:
    context = {
        "intent":            "request_service",
        "sentiment":         "neutral",
        "urgency_level":     "normal",
        "service_requested": "general contracting",
        "problem_type":      "repair needed",
        "caller_name":       None,
        "callback_requested": True,
        "timeline":          "this_week",
        "summary":           "Caller left a voicemail requesting a callback "
                             "about a repair job.",
        "confidence_score":  0.83,
    }
    return ExtractionResult(
        context=context,
        confidence_score=context["confidence_score"],
        mock_mode=True,
    )


def _mock_lead_form(normalized: dict) -> ExtractionResult:
    context = {
        "intent":           "request_quote",
        "sentiment":        "neutral",
        "urgency_level":    "normal",
        "service_requested": "roofing",
        "problem_type":     "needs inspection",
        "timeline":         "this_week",
        "summary":          "Customer submitted a lead form requesting "
                            "a quote for roofing work.",
        "confidence_score": 0.89,
    }
    return ExtractionResult(
        context=context,
        confidence_score=context["confidence_score"],
        mock_mode=True,
    )
