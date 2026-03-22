from django.conf import settings


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Prevent MIME type detection
        response.setdefault("X-Content-Type-Options", "nosniff")
        
        # Prevent click jacking
        response.setdefault("X-Frame-Options", "DENY")
        
        # Control referrer information
        response.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        
        # Restrict browser features
        response.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
        
        # Cross-origin policies
        response.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.setdefault("Cross-Origin-Resource-Policy", "same-origin")
        response.setdefault("Cross-Origin-Embedder-Policy", "require-corp")
        
        # Remove server header info without assuming dict-like pop support.
        if "Server" in response:
            del response["Server"]

        response["X-Content-Type-Options"] = "nosniff"
        
        # Content Security Policy
        csp = getattr(settings, "CONTENT_SECURITY_POLICY", "")
        if csp:
            response.setdefault("Content-Security-Policy", csp)
        
        # Additional security headers
        response.setdefault("X-XSS-Protection", "1; mode=block")
        response.setdefault("Expect-CT", "max-age=86400, enforce")
        
        # HSTS header for HTTPS
        if not settings.DEBUG:
            response.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains; preload"
            )
        
        return response
