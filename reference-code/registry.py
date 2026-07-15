# Provider Event Registry
# Maps provider + provider_event_name -> ClearSky event_type + Network Category
# This is deterministic. No AI. No guessing.

REGISTRY_VERSION = "1.0"

PROVIDER_EVENT_REGISTRY = {
    ("google_business_profile", "review.created"): {
        "event_type": "review_received",
        "network_category": "Trust",
        "requires_ai_extraction": True,
        "required_fields": ["location_id", "rating"],
        "description": "A new customer review was posted to Google Business Profile."
    },
    ("google_business_profile", "review.updated"): {
        "event_type": "review_updated",
        "network_category": "Trust",
        "requires_ai_extraction": True,
        "required_fields": ["location_id", "rating"],
        "description": "An existing Google Business Profile review was updated."
    },
    ("google_business_profile", "review.deleted"): {
        "event_type": "review_deleted",
        "network_category": "Trust",
        "requires_ai_extraction": False,
        "required_fields": ["location_id", "review_id"],
        "description": "A Google Business Profile review was deleted."
    },
    ("telnyx_voice", "call.no_answer"): {
        "event_type": "missed_call",
        "network_category": "Communication",
        "requires_ai_extraction": False,
        "required_fields": ["from", "to"],
        "description": "An inbound call was not answered."
    },
    ("telnyx_voice", "call.completed"): {
        "event_type": "call_completed",
        "network_category": "Communication",
        "requires_ai_extraction": False,
        "required_fields": ["from", "to"],
        "description": "A call was completed."
    },
    ("telnyx_sms", "message.received"): {
        "event_type": "inbound_sms",
        "network_category": "Communication",
        "requires_ai_extraction": True,
        "required_fields": ["from", "to", "text"],
        "description": "An inbound SMS was received."
    },
    ("clearsky_website_forms", "form.submitted"): {
        "event_type": "lead_form_submitted",
        "network_category": "Conversion",
        "requires_ai_extraction": True,
        "required_fields": ["form_id"],
        "description": "A website lead form was submitted."
    },
    ("dataforseo", "keyword.rank_changed"): {
        "event_type": "keyword_position_changed",
        "network_category": "Visibility",
        "requires_ai_extraction": False,
        "required_fields": ["keyword", "old_rank", "new_rank"],
        "description": "A tracked keyword changed ranking position."
    },
    ("contentradar", "keyword.spiking_detected"): {
        "event_type": "spiking_keyword_detected",
        "network_category": "Visibility",
        "requires_ai_extraction": False,
        "required_fields": ["keyword", "change_percent"],
        "description": "A demand spike was detected for a tracked keyword."
    },
}

# Known providers — used for provider identification
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

# Business location mapping — in a real system this is a database lookup
BUSINESS_LOCATION_MAP = {
    "gbp_loc_apex_001": "biz_apex_001",
    "gbp_loc_demo_001": "biz_demo_001",
}


def lookup_registry(provider: str, provider_event_name: str) -> dict | None:
    """
    Deterministic registry lookup.
    Returns the registry entry or None if not found.
    Never guesses. Never uses AI.
    """
    return PROVIDER_EVENT_REGISTRY.get((provider, provider_event_name))


def identify_provider(payload: dict) -> str | None:
    """
    Identify the provider from the incoming payload.
    Checks the 'provider' field first, then falls back to known patterns.
    Returns the provider string or None if unknown.
    """
    provider = payload.get("provider")
    if provider and provider in KNOWN_PROVIDERS:
        return provider
    return None


def match_business(provider: str, payload: dict) -> str | None:
    """
    Deterministic business matching.
    Maps provider-specific location/account IDs to ClearSky business IDs.
    """
    if provider == "google_business_profile":
        location_id = payload.get("location_id")
        if location_id:
            return BUSINESS_LOCATION_MAP.get(location_id)
    return None
