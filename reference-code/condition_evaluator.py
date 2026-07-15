"""
ClearSky AI Decision System
Condition Evaluator
===================
Reads condition objects from the database and evaluates them against
live Event data. Used by Section 2 (Signal Detection) and Section 3
(Orchestrator Decision).

Build once. Powers all rules.

Condition object format:
    {
        "field":    "field_name",           # dot notation for nested: "ai_context.sentiment"
        "operator": "operator_name",        # see SUPPORTED_OPERATORS below
        "value":    <any>                   # the value to compare against
    }

All conditions in a rule's conditions array are AND logic.
For OR logic, create separate Signal rules.

Supported operators:
    =               Equal
    !=              Not equal
    >               Greater than
    >=              Greater than or equal
    <               Less than
    <=              Less than or equal
    contains        Field value contains the given string (case-insensitive)
    contains_any    Field value (list) contains any item from the given list
    contains_all    Field value (list) contains all items from the given list
    in              Field value is in the given list
    not_in          Field value is not in the given list
    exists          Field exists and is not None/null (value param ignored)
    not_exists      Field does not exist or is None/null (value param ignored)

Field resolution:
    Simple fields:  "rating"  -> event_data["rating"]
    Nested fields:  "ai_context.sentiment" -> event_data["ai_context"]["sentiment"]
    Business config: "business_config.public_response_requires_approval"
                     -> event_data["business_config"]["public_response_requires_approval"]

Usage:
    from clearsky.engine.condition_evaluator import evaluate_conditions

    # event_data is a flat+nested dict built from the Event Object
    result = evaluate_conditions(rule_conditions, event_data)
    if result.passed:
        # all conditions met — Signal fires
"""

from __future__ import annotations
import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result object
# ---------------------------------------------------------------------------

@dataclass
class EvaluationResult:
    """
    Returned by evaluate_conditions().

    passed:         True if all conditions were met.
    failed_on:      List of condition dicts that did not pass.
    errors:         List of error messages for conditions that could not
                    be evaluated (missing field, bad operator, type error).
    evaluated:      Total number of conditions evaluated.
    """
    passed: bool
    failed_on: list[dict] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    evaluated: int = 0

    @property
    def has_errors(self) -> bool:
        return len(self.errors) > 0


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def evaluate_conditions(
    conditions: list[dict],
    event_data: dict,
) -> EvaluationResult:
    """
    Evaluate a list of condition objects against event_data.

    All conditions must pass for the result to be passed=True (AND logic).

    Args:
        conditions:  List of condition dicts from signal_rules.conditions
                     or orchestrator_rules.conditions.
        event_data:  Flat+nested dict built from the Event Object and
                     any joined context (ai_context, business_config, etc.)

    Returns:
        EvaluationResult with passed, failed_on, errors, and evaluated count.
    """
    if not conditions:
        # No conditions means the rule always fires (e.g. catch-all rules)
        return EvaluationResult(passed=True, evaluated=0)

    failed_on = []
    errors = []

    for condition in conditions:
        try:
            result = _evaluate_single(condition, event_data)
            if not result:
                failed_on.append(condition)
        except ConditionEvaluationError as e:
            errors.append(str(e))
            failed_on.append(condition)
            logger.warning(
                "Condition evaluation error: %s | condition=%s",
                e, condition
            )

    passed = len(failed_on) == 0 and len(errors) == 0

    return EvaluationResult(
        passed=passed,
        failed_on=failed_on,
        errors=errors,
        evaluated=len(conditions),
    )


# ---------------------------------------------------------------------------
# Single condition evaluation
# ---------------------------------------------------------------------------

def _evaluate_single(condition: dict, event_data: dict) -> bool:
    """
    Evaluate one condition object against event_data.
    Raises ConditionEvaluationError on invalid input.
    """
    field_path = condition.get("field")
    operator   = condition.get("operator")
    value      = condition.get("value")

    if not field_path:
        raise ConditionEvaluationError(
            f"Condition missing 'field': {condition}"
        )
    if not operator:
        raise ConditionEvaluationError(
            f"Condition missing 'operator': {condition}"
        )

    # Resolve field value using dot notation
    field_value = _resolve_field(field_path, event_data)

    # Dispatch to operator handler
    handler = OPERATOR_HANDLERS.get(operator)
    if handler is None:
        raise ConditionEvaluationError(
            f"Unknown operator '{operator}' in condition: {condition}. "
            f"Supported: {list(OPERATOR_HANDLERS.keys())}"
        )

    return handler(field_value, value, field_path)


# ---------------------------------------------------------------------------
# Field resolution
# ---------------------------------------------------------------------------

def _resolve_field(field_path: str, event_data: dict) -> Any:
    """
    Resolve a dot-notation field path against event_data.

    Examples:
        "rating"                          -> event_data["rating"]
        "ai_context.sentiment"            -> event_data["ai_context"]["sentiment"]
        "business_config.review_policy"   -> event_data["business_config"]["review_policy"]

    Returns None if any part of the path is missing.
    Does not raise — missing fields return None (evaluated by exists/not_exists operators).
    """
    parts = field_path.split(".")
    current = event_data

    for part in parts:
        if current is None:
            return None
        if isinstance(current, dict):
            current = current.get(part)
        else:
            # Can't traverse further
            return None

    return current


# ---------------------------------------------------------------------------
# Operator handlers
# Each handler receives (field_value, condition_value, field_path) and
# returns True if the condition passes.
# ---------------------------------------------------------------------------

def _op_eq(field_value: Any, condition_value: Any, field_path: str) -> bool:
    """= : field value equals condition value."""
    if field_value is None and condition_value is not None:
        return False
    return field_value == condition_value


def _op_neq(field_value: Any, condition_value: Any, field_path: str) -> bool:
    """!= : field value does not equal condition value."""
    return field_value != condition_value


def _op_gt(field_value: Any, condition_value: Any, field_path: str) -> bool:
    """> : field value is greater than condition value."""
    if field_value is None:
        return False
    try:
        return float(field_value) > float(condition_value)
    except (TypeError, ValueError) as e:
        raise ConditionEvaluationError(
            f"Cannot compare '{field_path}' ({field_value!r}) > {condition_value!r}: {e}"
        )


def _op_gte(field_value: Any, condition_value: Any, field_path: str) -> bool:
    """>= : field value is greater than or equal to condition value."""
    if field_value is None:
        return False
    try:
        return float(field_value) >= float(condition_value)
    except (TypeError, ValueError) as e:
        raise ConditionEvaluationError(
            f"Cannot compare '{field_path}' ({field_value!r}) >= {condition_value!r}: {e}"
        )


def _op_lt(field_value: Any, condition_value: Any, field_path: str) -> bool:
    """< : field value is less than condition value."""
    if field_value is None:
        return False
    try:
        return float(field_value) < float(condition_value)
    except (TypeError, ValueError) as e:
        raise ConditionEvaluationError(
            f"Cannot compare '{field_path}' ({field_value!r}) < {condition_value!r}: {e}"
        )


def _op_lte(field_value: Any, condition_value: Any, field_path: str) -> bool:
    """<= : field value is less than or equal to condition value."""
    if field_value is None:
        return False
    try:
        return float(field_value) <= float(condition_value)
    except (TypeError, ValueError) as e:
        raise ConditionEvaluationError(
            f"Cannot compare '{field_path}' ({field_value!r}) <= {condition_value!r}: {e}"
        )


def _op_contains(field_value: Any, condition_value: Any, field_path: str) -> bool:
    """
    contains : field value (string or list) contains condition value.
    String: case-insensitive substring match.
    List: checks if condition_value is an item in the list.
    """
    if field_value is None:
        return False
    if isinstance(field_value, str):
        return str(condition_value).lower() in field_value.lower()
    if isinstance(field_value, list):
        return condition_value in field_value
    raise ConditionEvaluationError(
        f"'contains' operator requires string or list field. "
        f"'{field_path}' is {type(field_value).__name__}."
    )


def _op_contains_any(field_value: Any, condition_value: Any, field_path: str) -> bool:
    """
    contains_any : field value (list or string) contains any item from condition_value (list).
    Used for complaint_topics, praise_topics, etc.
    String field: checks if any condition item is a substring.
    List field: checks if any condition item is in the list.
    """
    if field_value is None:
        return False
    if not isinstance(condition_value, list):
        raise ConditionEvaluationError(
            f"'contains_any' operator requires condition value to be a list. "
            f"Got {type(condition_value).__name__}."
        )
    if isinstance(field_value, list):
        # Check if any condition item appears in the field list
        field_lower = [str(v).lower() for v in field_value]
        return any(str(cv).lower() in field_lower for cv in condition_value)
    if isinstance(field_value, str):
        # Check if any condition item appears as substring in the string
        field_lower = field_value.lower()
        return any(str(cv).lower() in field_lower for cv in condition_value)
    raise ConditionEvaluationError(
        f"'contains_any' operator requires string or list field. "
        f"'{field_path}' is {type(field_value).__name__}."
    )


def _op_contains_all(field_value: Any, condition_value: Any, field_path: str) -> bool:
    """
    contains_all : field value (list) contains all items from condition_value (list).
    """
    if field_value is None:
        return False
    if not isinstance(condition_value, list):
        raise ConditionEvaluationError(
            f"'contains_all' operator requires condition value to be a list."
        )
    if isinstance(field_value, list):
        field_lower = [str(v).lower() for v in field_value]
        return all(str(cv).lower() in field_lower for cv in condition_value)
    raise ConditionEvaluationError(
        f"'contains_all' operator requires a list field. "
        f"'{field_path}' is {type(field_value).__name__}."
    )


def _op_in(field_value: Any, condition_value: Any, field_path: str) -> bool:
    """
    in : field value is in the condition_value list.
    Example: {"field": "ai_context.sentiment", "operator": "in", "value": ["positive", "mixed"]}
    """
    if field_value is None:
        return False
    if not isinstance(condition_value, list):
        raise ConditionEvaluationError(
            f"'in' operator requires condition value to be a list."
        )
    return field_value in condition_value


def _op_not_in(field_value: Any, condition_value: Any, field_path: str) -> bool:
    """
    not_in : field value is not in the condition_value list.
    """
    if not isinstance(condition_value, list):
        raise ConditionEvaluationError(
            f"'not_in' operator requires condition value to be a list."
        )
    return field_value not in condition_value


def _op_exists(field_value: Any, condition_value: Any, field_path: str) -> bool:
    """
    exists : field exists and is not None and not empty.
    condition_value is ignored (convention: pass true).
    Empty list or empty string counts as not existing.
    """
    if field_value is None:
        return False
    if isinstance(field_value, (list, str, dict)) and len(field_value) == 0:
        return False
    return True


def _op_not_exists(field_value: Any, condition_value: Any, field_path: str) -> bool:
    """
    not_exists : field does not exist, is None, or is empty.
    condition_value is ignored (convention: pass true).
    """
    return not _op_exists(field_value, condition_value, field_path)


# ---------------------------------------------------------------------------
# Operator dispatch table
# ---------------------------------------------------------------------------

OPERATOR_HANDLERS: dict[str, callable] = {
    "=":            _op_eq,
    "!=":           _op_neq,
    ">":            _op_gt,
    ">=":           _op_gte,
    "<":            _op_lt,
    "<=":           _op_lte,
    "contains":     _op_contains,
    "contains_any": _op_contains_any,
    "contains_all": _op_contains_all,
    "in":           _op_in,
    "not_in":       _op_not_in,
    "exists":       _op_exists,
    "not_exists":   _op_not_exists,
}

SUPPORTED_OPERATORS = list(OPERATOR_HANDLERS.keys())


# ---------------------------------------------------------------------------
# Error class
# ---------------------------------------------------------------------------

class ConditionEvaluationError(Exception):
    """
    Raised when a condition cannot be evaluated due to invalid structure,
    missing required data, type mismatch, or unknown operator.

    The engine catches this and records it as an evaluation error rather
    than crashing the workflow. The Signal does not fire when an error occurs.
    """
    pass


# ---------------------------------------------------------------------------
# Event data builder
# ---------------------------------------------------------------------------

def build_event_data(event: dict, business_config: dict | None = None) -> dict:
    """
    Build the flat+nested event_data dict that the evaluator works against.

    Takes a raw Event Object dict (as returned from the database) and
    structures it for field resolution. Also injects business_config
    so Orchestrator rules can reference business policy fields.

    Args:
        event:           Dict representation of the Event Object row.
        business_config: Dict from business_configurations table, or None.

    Returns:
        event_data dict ready for evaluate_conditions().

    Example output:
        {
            "event_id":             "evt_001",
            "event_type":           "review_received",
            "network_category":     "Trust",
            "rating":               4,
            "review_text":          "Great work...",
            "rating_content_mismatch": False,
            "business_matched":     True,
            "requires_ai_extraction": True,
            "ai_extraction_completed": True,
            "ai_context": {
                "sentiment":        "mixed",
                "confidence_score": 0.91,
                "complaint_topics": ["slow communication"],
                "praise_topics":    ["professional crew"],
                "service_mentioned": "roof repair",
                "intent":           "provide_feedback",
                "urgency_level":    "normal",
                "legal_threat":     False,
            },
            "business_config": {
                "public_response_requires_approval": True,
                "review_reply_policy":               "draft_only",
                "brand_tone":                        "professional",
                "sla_response_hours":                24,
            }
        }
    """
    # Start with the flat event fields
    data = dict(event)

    # Ensure ai_context is a dict (may be None or already a dict)
    ai_context = event.get("ai_context") or {}
    if isinstance(ai_context, str):
        import json
        try:
            ai_context = json.loads(ai_context)
        except (json.JSONDecodeError, TypeError):
            ai_context = {}
    data["ai_context"] = ai_context

    # Inject business config as a nested dict
    if business_config:
        data["business_config"] = dict(business_config)
    else:
        data["business_config"] = {}

    return data
