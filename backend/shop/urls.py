from django.urls import path

from .views import (
    create_order,
    create_payment,
    get_csrf_token,
    get_current_user,
    get_products,
    login_user,
    logout_user,
    register_user,
)

urlpatterns = [
    path("products/", get_products),
    path("order/", create_order),
    path("payment/create/", create_payment),
    path("auth/csrf/", get_csrf_token),
    path("auth/me/", get_current_user),
    path("auth/register/", register_user),
    path("auth/login/", login_user),
    path("auth/logout/", logout_user),
]
