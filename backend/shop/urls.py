from django.urls import path

from .views import create_order, create_payment, get_products

urlpatterns = [
    path("products/", get_products),
    path("order/", create_order),
    path("payment/create/", create_payment),
]
