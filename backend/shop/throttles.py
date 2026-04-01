from rest_framework.throttling import ScopedRateThrottle


class AuthLoginRateThrottle(ScopedRateThrottle):
    scope = "auth_login"


class AuthRegisterRateThrottle(ScopedRateThrottle):
    scope = "auth_register"


class AuthUserRateThrottle(ScopedRateThrottle):
    scope = "auth_user"


class PaymentRateThrottle(ScopedRateThrottle):
    scope = "payments"


class OrderRateThrottle(ScopedRateThrottle):
    scope = "orders"


class ProductRateThrottle(ScopedRateThrottle):
    scope = "products"


class FeedbackRateThrottle(ScopedRateThrottle):
    scope = "feedback"
