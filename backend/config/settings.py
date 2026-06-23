import importlib.util
import os
import shutil
from datetime import timedelta
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse


BASE_DIR = Path(__file__).resolve().parent.parent


def load_env_file(path):
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_env_file(BASE_DIR / ".env")


def env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name, default):
    value = os.environ.get(name)
    if value is None:
        return default
    return int(value)


def env_list(name, default=""):
    value = os.environ.get(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


def env_path(name, default=""):
    value = os.environ.get(name, default).strip()
    return Path(value).expanduser() if value else None


def database_config_from_url(url):
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()

    if scheme in {"postgres", "postgresql", "pgsql"}:
        query = parse_qs(parsed.query)
        config = {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": unquote(parsed.path.lstrip("/")),
            "USER": unquote(parsed.username or ""),
            "PASSWORD": unquote(parsed.password or ""),
            "HOST": parsed.hostname or "",
            "PORT": str(parsed.port or "5432"),
        }
        ssl_mode = query.get("sslmode", [""])[0]
        if ssl_mode:
            config["OPTIONS"] = {"sslmode": ssl_mode}
        return config

    if scheme in {"mysql", "mariadb"}:
        config = {
            "ENGINE": "django.db.backends.mysql",
            "NAME": unquote(parsed.path.lstrip("/")),
            "USER": unquote(parsed.username or ""),
            "PASSWORD": unquote(parsed.password or ""),
            "HOST": parsed.hostname or "",
            "PORT": str(parsed.port or "3306"),
        }
        return config

    if scheme in {"sqlite", "sqlite3"}:
        database_path = unquote(parsed.path or "")
        if database_path in {"", "/"}:
            database_path = str(BASE_DIR / "db.sqlite3")
        if os.name == "nt" and database_path.startswith("/") and len(database_path) > 2 and database_path[2] == ":":
            database_path = database_path.lstrip("/")
        return {"ENGINE": "django.db.backends.sqlite3", "NAME": database_path}

    raise ValueError(f"Unsupported DATABASE_URL scheme: {scheme}")



SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
DEBUG = env_bool("DJANGO_DEBUG", False)

if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "django-insecure-dev-only-key-change-in-production"
    else:
        raise RuntimeError("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is False.")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost,testserver" if DEBUG else "")
if not DEBUG and not ALLOWED_HOSTS:
    raise RuntimeError("DJANGO_ALLOWED_HOSTS must be configured in production.")

DEFAULT_FRONTEND_ORIGIN = os.environ.get("DJANGO_DEFAULT_FRONTEND_ORIGIN", "http://localhost:3000" if DEBUG else "https://petals-and-floras.vercel.app")
CORS_ALLOWED_ORIGINS = env_list("DJANGO_CORS_ALLOWED_ORIGINS", DEFAULT_FRONTEND_ORIGIN)
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS", DEFAULT_FRONTEND_ORIGIN)
if not DEBUG and not CORS_ALLOWED_ORIGINS:
    raise RuntimeError("DJANGO_CORS_ALLOWED_ORIGINS must be configured in production.")
if not DEBUG and not CSRF_TRUSTED_ORIGINS:
    raise RuntimeError("DJANGO_CSRF_TRUSTED_ORIGINS must be configured in production.")


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "axes",
    "shop",
]

if importlib.util.find_spec("jazzmin") is not None:
    INSTALLED_APPS.insert(0, "jazzmin")

HAS_ALLAUTH = importlib.util.find_spec("allauth") is not None
if HAS_ALLAUTH:
    INSTALLED_APPS.extend(
        [
            "django.contrib.sites",
            "allauth",
            "allauth.account",
            "allauth.socialaccount",
            "allauth.socialaccount.providers.google",
        ]
    )

HAS_WHITENOISE = importlib.util.find_spec("whitenoise") is not None

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware" if HAS_WHITENOISE else None,
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "axes.middleware.AxesMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "shop.middleware.SecurityHeadersMiddleware",
]
MIDDLEWARE = [entry for entry in MIDDLEWARE if entry]

if HAS_ALLAUTH:
    MIDDLEWARE.insert(
        MIDDLEWARE.index("django.contrib.auth.middleware.AuthenticationMiddleware") + 1,
        "allauth.account.middleware.AccountMiddleware",
    )

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "config.wsgi.application"

SITE_ID = 1

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "django.contrib.auth.backends.ModelBackend",
]
if HAS_ALLAUTH:
    AUTHENTICATION_BACKENDS.append("allauth.account.auth_backends.AuthenticationBackend")


DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
if DATABASE_URL:
    DATABASES = {"default": database_config_from_url(DATABASE_URL)}
else:
    sqlite_name = BASE_DIR / "db.sqlite3"
    local_sqlite_override = env_path("DJANGO_LOCAL_SQLITE_DIR")
    use_local_appdata_sqlite = env_bool("DJANGO_USE_LOCAL_APPDATA_SQLITE", False)

    if DEBUG and os.name == "nt" and (use_local_appdata_sqlite or local_sqlite_override):
        local_appdata = Path(os.environ.get("LOCALAPPDATA", BASE_DIR))
        local_sqlite_dir = local_sqlite_override or (local_appdata / "PetalsAndFloras")
        local_sqlite_dir.mkdir(parents=True, exist_ok=True)
        local_sqlite_name = local_sqlite_dir / "db.sqlite3"

        if not local_sqlite_name.exists() and sqlite_name.exists():
            try:
                shutil.copy2(sqlite_name, local_sqlite_name)
                sqlite_name = local_sqlite_name
            except OSError:
                pass
        else:
            sqlite_name = local_sqlite_name

    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": sqlite_name}}


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
if HAS_WHITENOISE:
    STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://127.0.0.1:27017/")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "petals_flora_db")

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

DEFAULT_EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
if DEBUG and not os.environ.get("DJANGO_EMAIL_BACKEND"):
    if not os.environ.get("DJANGO_EMAIL_HOST_USER") or not os.environ.get("DJANGO_EMAIL_HOST_PASSWORD"):
        DEFAULT_EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

EMAIL_BACKEND = os.environ.get("DJANGO_EMAIL_BACKEND", DEFAULT_EMAIL_BACKEND)
EMAIL_HOST = os.environ.get("DJANGO_EMAIL_HOST", "localhost")
EMAIL_PORT = env_int("DJANGO_EMAIL_PORT", 587)
EMAIL_HOST_USER = os.environ.get("DJANGO_EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("DJANGO_EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("DJANGO_EMAIL_USE_TLS", True)
EMAIL_USE_SSL = env_bool("DJANGO_EMAIL_USE_SSL", False)
EMAIL_TIMEOUT = env_int("DJANGO_EMAIL_TIMEOUT", 20)
DEFAULT_FROM_EMAIL = os.environ.get("DJANGO_DEFAULT_FROM_EMAIL", "Petals & Flora <no-reply@petalsandfloras.com>")
FRONTEND_BASE_URL = os.environ.get("FRONTEND_BASE_URL", (CORS_ALLOWED_ORIGINS[0] if CORS_ALLOWED_ORIGINS else DEFAULT_FRONTEND_ORIGIN)).rstrip("/")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "shop.authentication.CookieJWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.environ.get("DRF_THROTTLE_ANON", "60/minute"),
        "user": os.environ.get("DRF_THROTTLE_USER", "120/minute"),
        "auth_login": os.environ.get("DRF_THROTTLE_AUTH_LOGIN", "8/minute"),
        "auth_register": os.environ.get("DRF_THROTTLE_AUTH_REGISTER", "5/minute"),
        "auth_user": os.environ.get("DRF_THROTTLE_AUTH_USER", "30/minute"),
        "payments": os.environ.get("DRF_THROTTLE_PAYMENTS", "10/minute"),
        "orders": os.environ.get("DRF_THROTTLE_ORDERS", "30/minute"),
        "products": os.environ.get("DRF_THROTTLE_PRODUCTS", "120/minute"),
        "feedback": os.environ.get("DRF_THROTTLE_FEEDBACK", "20/minute"),
    },
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

AXES_FAILURE_LIMIT = env_int("AXES_FAILURE_LIMIT", 5)
AXES_ENABLED = not DEBUG
AXES_COOLOFF_TIME = timedelta(hours=1)
AXES_LOCKOUT_PARAMETERS = ["username", "ip_address"]
AXES_RESET_ON_SUCCESS = True
AXES_VERBOSE = DEBUG
AXES_USERNAME_FORM_FIELD = "email"
AUTH_LOGIN_RATELIMIT = os.environ.get("DJANGO_AUTH_LOGIN_RATELIMIT", "30/m" if DEBUG else "5/10m")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
SECURE_CROSS_ORIGIN_RESOURCE_POLICY = "same-origin"
APPEND_SLASH = True
X_FRAME_OPTIONS = "DENY"

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SAMESITE = os.environ.get("DJANGO_SESSION_COOKIE_SAMESITE", "Lax" if DEBUG else "None")
SESSION_COOKIE_AGE = env_int("DJANGO_SESSION_COOKIE_AGE", 60 * 60 * 2)
SESSION_SAVE_EVERY_REQUEST = True

CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SAMESITE = os.environ.get("DJANGO_CSRF_COOKIE_SAMESITE", "Lax" if DEBUG else "None")
CSRF_FAILURE_VIEW = "shop.views.csrf_failure"

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False

if DEBUG:
    SECURE_SSL_REDIRECT = False
    SECURE_HSTS_SECONDS = 0
    SECURE_HSTS_INCLUDE_SUBDOMAINS = False
    SECURE_HSTS_PRELOAD = False
else:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

CONTENT_SECURITY_POLICY = "; ".join(
    [
        "default-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "form-action 'self' https://api.razorpay.com",
        "object-src 'none'",
        "script-src 'self' https://checkout.razorpay.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https://api.razorpay.com",
        "frame-src https://api.razorpay.com https://checkout.razorpay.com",
        "upgrade-insecure-requests",
    ]
)

logs_dir = BASE_DIR / "logs"
logs_dir.mkdir(exist_ok=True)
LOG_FILE = env_path("DJANGO_LOG_FILE", str(logs_dir / "security.log"))

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
        },
    },
    "handlers": {
        "payment_file": {
            "level": "WARNING",
            "class": "logging.FileHandler",
            "filename": str(LOG_FILE),
            "formatter": "verbose",
        },
        "console": {
            "level": "INFO" if DEBUG else "WARNING",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console", "payment_file"],
            "level": "WARNING",
            "propagate": True,
        },
        "payments": {
            "handlers": ["console", "payment_file"],
            "level": "INFO",
            "propagate": False,
        },
        "security": {
            "handlers": ["console", "payment_file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

if HAS_ALLAUTH:
    SOCIALACCOUNT_PROVIDERS = {
        "google": {
            "APP": {
                "client_id": os.environ.get("GOOGLE_CLIENT_ID", ""),
                "secret": os.environ.get("GOOGLE_CLIENT_SECRET", ""),
                "key": "",
            },
            "SCOPE": [
                "profile",
                "email",
            ],
            "AUTH_PARAMS": {
                "access_type": "online",
            },
        }
    }
    SOCIALACCOUNT_LOGIN_ON_GET = True
    SOCIALACCOUNT_AUTO_SIGNUP = True
    SOCIALACCOUNT_ADAPTER = "shop.adapters.CustomSocialAccountAdapter"
    ACCOUNT_EMAIL_REQUIRED = True
    ACCOUNT_UNIQUE_EMAIL = True
    ACCOUNT_USERNAME_REQUIRED = False
    ACCOUNT_AUTHENTICATION_METHOD = "email"
    ACCOUNT_EMAIL_VERIFICATION = "none"
    LOGIN_REDIRECT_URL = "/api/auth/google/success/"

