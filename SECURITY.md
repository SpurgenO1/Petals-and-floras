# Security Implementation Guide - Petals & Flora

## Overview
This document outlines all security improvements implemented across the application, including backend (Django) and frontend (React) security measures.

---

## Backend Security Enhancements

### 1. Configuration Security (`config/settings.py`)

#### SECRET_KEY Management
- **Before**: Hardcoded insecure default key in version control
- **After**: Requires environment variable in production; raises error if not set
- **Implementation**:
  ```python
  SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
  if not SECRET_KEY:
      if env_bool("DJANGO_DEBUG", False):
          SECRET_KEY = "django-insecure-dev-only-key-change-in-production"
      else:
          raise ValueError("Set DJANGO_SECRET_KEY environment variable in production")
  ```

#### DEBUG Mode
- **Before**: Defaults to `True` (exposes sensitive information)
- **After**: Defaults to `False`; explicitly set via environment variable
- **Impact**: Prevents information disclosure in production

#### ALLOWED_HOSTS Enforcement
- **Before**: Default localhost settings
- **After**: Requires explicit configuration in production; validates on startup
- **Impact**: Prevents Host header injection attacks

#### CORS/CSRF Protection
- **Before**: Allows `localhost:3000` and `127.0.0.1:3000` broadly
- **After**: 
  - Validates CORS origins on every request
  - Requires explicit CSRF trusted origins
  - Uses Strict mode for cookies: `SameSite=Strict`
  - Cookie secure flag enforced in production
  
### 2. Cookie & Session Security
```python
SESSION_COOKIE_HTTPONLY = True          # Prevent JavaScript access
CSRF_COOKIE_HTTPONLY = True             # Prevent CSRF token theft
SESSION_COOKIE_SAMESITE = "Strict"      # Prevent cross-site cookie access
CSRF_COOKIE_SAMESITE = "Strict"
SESSION_COOKIE_SECURE = True (prod)     # HTTPS only
CSRF_COOKIE_SECURE = True (prod)
SESSION_COOKIE_AGE = 7200 (prod, 2 hrs) # Shorter timeout
```

### 3. Security Headers

#### Content Security Policy (CSP)
- Restricts script execution to same-origin + Razorpay
- Blocks inline scripts
- Allows only HTTPS connections
- Whitelist external resources (Razorpay, Google Fonts)

#### HTTP Security Headers
```
X-Content-Type-Options: nosniff          # Prevent MIME type sniffing
X-Frame-Options: DENY                    # Prevent clickjacking
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 4. Input Validation & Sanitization

#### Enhanced Validation (`shop/serializers.py`)
```python
# Phone validation
validate_phone(): Must be exactly 10 digits

# Address validation
validate_address(): Between 5 and 500 characters

# Pincode validation
validate_pincode(): Must be exactly 6 digits (if provided)

# Price validation
price: Integer between 0 and 999,999,999

# Amount validation
amount: Integer between 1 and 100,000,000 (1 crore)
```

#### Input Sanitization (`shop/views.py`)
```python
def sanitize_string(value, max_length=500):
    """Remove potentially dangerous characters while preserving legitimate text"""
    sanitized = re.sub(r'[<>"\']', '', value.strip())
    return sanitized[:max_length]
```

### 5. API Endpoint Security

#### Rate Limiting
- **Products**: 120 requests/minute
- **Orders**: 30 requests/minute  
- **Payments**: 10 requests/minute (strictest)
- **Anonymous**: 60 requests/minute default
- **Per-user**: 120 requests/minute

#### Query Limits
- Product list: Limited to 200 items maximum
- Cart items: Maximum 100 items per order
- Input field lengths: Enforced at serializer level

#### Payment Endpoint Security
```python
# Validate amount range
min_amount = 1          # 1 paise
max_amount = 100000000  # 1 crore rupees

# Validate format (must be integer)
# Validate Razorpay keys are configured
# Try-catch payment processing errors
```

### 6. Error Handling & Information Disclosure
- Generic error messages returned to client
- Specific errors logged server-side only
- No database/implementation details in API responses
- Proper HTTP status codes (403, 429, 502, 503, etc.)

### 7. MongoDB Security (`shop/mongo.py`)
- Use environment-based connection strings
- Implement connection pooling
- Create indexes for common queries
- Enforce partial unique indexes where needed

---

## Frontend Security Enhancements

### 1. API Security (`src/services/api.js`)

#### Request Interceptor
```javascript
// Add CSRF token from meta tag if available
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
if (csrfToken) {
    config.headers["X-CSRFToken"] = csrfToken;
}

// Add security headers
config.headers["X-Requested-With"] = "XMLHttpRequest";
```

#### HTTPS Enforcement
```javascript
// Warn if API URL is not HTTPS in production
if (process.env.NODE_ENV === "production" && !API_BASE_URL.startsWith("https://")) {
    console.warn("WARNING: API URL should use HTTPS in production");
}
```

#### Credentials & Same-Origin
```javascript
withCredentials: true  // Include cookies in cross-origin requests
```

#### Response Interceptor
- Handles 403 (CSRF errors) with user-friendly messages
- Handles 429 (rate limit) with retry guidance
- Handles 5xx errors with contact support message
- Logs errors to console for debugging

### 2. Input Validation
```javascript
// Validate payment amount before sending
if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
    throw new Error("Invalid payment amount");
}

// Validate payload structure
if (!payload || typeof payload !== "object") {
    throw new Error("Invalid order payload");
}
```

### 3. Error Handling
- Prevent sensitive error details from reaching client
- User-friendly error messages
- Proper error logging for debugging

---

## Environment Configuration

### Setup Steps

1. **Copy template file**:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Generate secure SECRET_KEY**:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(50))"
   ```

3. **Set production values in `.env`**:
   ```
   DJANGO_SECRET_KEY=<your-generated-key>
   DJANGO_DEBUG=False
   DJANGO_ALLOWED_HOSTS=yourdomain.com
   DJANGO_CORS_ALLOWED_ORIGINS=https://yourdomain.com
   DJANGO_CSRF_TRUSTED_ORIGINS=https://yourdomain.com
   RAZORPAY_KEY_ID=<production-key>
   RAZORPAY_KEY_SECRET=<production-secret>
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/
   ```

4. **Frontend environment** (`.env` in frontend):
   ```
   REACT_APP_API_BASE_URL=https://your-api-domain.com/api/
   ```

---

## Security Checklist

### Development
- [ ] Update `.env` with development values
- [ ] Run on localhost only
- [ ] Use DEBUG=True for development  
- [ ] Test all API endpoints for injection vulnerabilities
- [ ] Verify input validation works
- [ ] Test rate limiting

### Before Production Deployment
- [ ] Set `DJANGO_DEBUG=False`
- [ ] Generate new `DJANGO_SECRET_KEY`
- [ ] Update `DJANGO_ALLOWED_HOSTS` with actual domain
- [ ] Update `DJANGO_CORS_ALLOWED_ORIGINS` with actual frontend URL
- [ ] Update `DJANGO_CSRF_TRUSTED_ORIGINS`
- [ ] Set Razorpay to production keys
- [ ] Configure MongoDB with strong authentication
- [ ] Enable MongoDB encryption at rest
- [ ] Set up HTTPS/SSL certificates
- [ ] Enable rate limiting monitoring
- [ ] Set up error tracking/logging service
- [ ] Review all API error responses
- [ ] Test CSRF protection
- [ ] Verify CORS properly rejects invalid origins
- [ ] Test payment flow with production Razorpay keys
- [ ] Set up automated backups
- [ ] Document all environment variables

### Ongoing Monitoring
- [ ] Monitor for rate limit abuse
- [ ] Review error logs for injection attempts
- [ ] Periodically rotate Razorpay keys
- [ ] Update dependencies for security patches
- [ ] Perform security audits quarterly
- [ ] Review access logs for suspicious activity
- [ ] Monitor MongoDB for unauthorized connections

---

## Key Security Improvements Summary

| Area | Before | After |
|------|--------|-------|
| **Secret Key** | Hardcoded, exposed | Environment-based, production safe |
| **DEBUG mode** | Always True | Defaults to False |
| **Input Validation** | Basic string checks | Comprehensive validation + sanitization |
| **Rate Limiting** | Only payments/orders | All endpoints throttled |
| **CORS** | Broad defaults | Strict, environment-based |
| **CSRF** | Lax SameSite | Strict SameSite + HTTPONLY |
| **Cookies** | Not secure | Secure + HTTPONLY + SameSite |
| **Headers** | Basic | Comprehensive CSP + security headers |
| **Error Handling** | Exposes details | Generic messages, detailed logging |
| **API Response** | Unvalidated data | Sanitized, validated responses |

---

## Resources

- [Django Security Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [OWASP Top 10](https://owasp.org/Top10/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HTTP Security Headers](https://secureheaders.com/)
- [Authentication Best Practices](https://www.owasp.org/index.php/Authentication_Cheat_Sheet)

---

## Questions?

For security concerns or vulnerabilities, please contact the development team immediately.
Do not disclose security issues publicly before they are patched.
