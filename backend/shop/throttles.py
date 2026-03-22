from rest_framework.throttling import ScopedRateThrottle


class PaymentRateThrottle(ScopedRateThrottle):
    scope = "payments"


class OrderRateThrottle(ScopedRateThrottle):
    scope = "orders"


class ProductRateThrottle(ScopedRateThrottle):
    scope = "products"
