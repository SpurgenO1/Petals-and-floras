from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.utils import timezone


BUSINESS_TIMEZONE = ZoneInfo("Asia/Kolkata")
SAME_DAY_CUTOFF_HOUR = 14
MAX_SLOT_CAPACITY = 12
MAX_DELIVERY_DAYS_AHEAD = 21

DELIVERY_SLOT_DEFINITIONS = (
    {
        "code": "morning",
        "label": "10:00 AM - 12:00 PM",
        "window": "Morning surprise",
        "start_hour": 10,
        "end_hour": 12,
    },
    {
        "code": "afternoon",
        "label": "1:00 PM - 3:00 PM",
        "window": "Afternoon celebration",
        "start_hour": 13,
        "end_hour": 15,
    },
    {
        "code": "evening",
        "label": "4:00 PM - 6:00 PM",
        "window": "Golden hour gifting",
        "start_hour": 16,
        "end_hour": 18,
    },
)

DELIVERY_SLOT_LOOKUP = {slot["code"]: slot for slot in DELIVERY_SLOT_DEFINITIONS}

DELIVERY_STATUS_FLOW = (
    ("order_placed", "Order Placed"),
    ("preparing_bouquet", "Preparing Bouquet"),
    ("out_for_delivery", "Out for Delivery"),
    ("delivered", "Delivered"),
)

DELIVERY_STATUS_LABELS = dict(DELIVERY_STATUS_FLOW)


def get_business_now():
    return timezone.now().astimezone(BUSINESS_TIMEZONE)


def get_business_today():
    return get_business_now().date()


def get_slot_choices():
    return [(slot["code"], slot["label"]) for slot in DELIVERY_SLOT_DEFINITIONS]


def get_delivery_status_choices():
    return list(DELIVERY_STATUS_FLOW)


def get_slot_label(slot_code):
    return DELIVERY_SLOT_LOOKUP.get(slot_code, {}).get("label", "")


def get_delivery_status_label(status_code):
    return DELIVERY_STATUS_LABELS.get(status_code, "")


def parse_delivery_date(raw_value):
    if not raw_value:
        return None

    try:
        return datetime.strptime(str(raw_value), "%Y-%m-%d").date()
    except ValueError:
        return None


def is_same_day_available(now=None):
    current_time = now or get_business_now()
    return current_time.hour < SAME_DAY_CUTOFF_HOUR


def build_slot_availability(delivery_date, slot_counts=None, now=None):
    current_time = now or get_business_now()
    slot_counts = slot_counts or {}
    today = current_time.date()
    slots = []

    for slot in DELIVERY_SLOT_DEFINITIONS:
        booked_count = int(slot_counts.get(slot["code"], 0))
        reasons = []

        if delivery_date < today:
            reasons.append("Past dates are unavailable.")

        if delivery_date > today + timedelta(days=MAX_DELIVERY_DAYS_AHEAD):
            reasons.append("Please choose a delivery date within the next 21 days.")

        if delivery_date == today:
            if not is_same_day_available(current_time):
                reasons.append("Same-day delivery closes at 2:00 PM.")
            elif current_time.hour >= slot["start_hour"]:
                reasons.append("This delivery window has already started.")

        if booked_count >= MAX_SLOT_CAPACITY:
            reasons.append("This slot is fully booked.")

        slots.append(
            {
                "code": slot["code"],
                "label": slot["label"],
                "window": slot["window"],
                "available": not reasons,
                "remaining_capacity": max(MAX_SLOT_CAPACITY - booked_count, 0),
                "reason": reasons[0] if reasons else "",
            }
        )

    return slots
