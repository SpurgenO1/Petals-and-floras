from pymongo import MongoClient
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import OperationFailure
from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone


def get_database():
    client = MongoClient(
        settings.MONGO_URI,
        serverSelectionTimeoutMS=3000,
        connectTimeoutMS=3000,
        socketTimeoutMS=3000,
    )
    return client[settings.MONGO_DB_NAME]


def get_products_collection():
    collection = get_database()["products"]
    collection.create_index([("django_product_id", ASCENDING)], unique=True, sparse=True)
    collection.create_index([("updated_at", DESCENDING)])
    return collection


def get_orders_collection():
    collection = get_database()["orders"]
    collection.create_index([("created_at", DESCENDING)])
    collection.create_index([("payment.status", ASCENDING)])
    collection.create_index([("payment.method", ASCENDING)])

    existing_indexes = collection.index_information()
    admin_order_index = existing_indexes.get("admin_order_id_1")
    partial_filter = {"admin_order_id": {"$exists": True}}

    if admin_order_index and admin_order_index.get("unique") and admin_order_index.get("partialFilterExpression") != partial_filter:
        try:
            collection.drop_index("admin_order_id_1")
        except OperationFailure:
            pass

    collection.create_index(
        [("admin_order_id", ASCENDING)],
        unique=True,
        partialFilterExpression=partial_filter,
    )
    return collection


def get_users_collection():
    collection = get_database()["users"]
    collection.create_index([("django_user_id", ASCENDING)], unique=True, sparse=True)
    collection.create_index([("email", ASCENDING)], unique=True, sparse=True)
    collection.create_index([("username", ASCENDING)], unique=True, sparse=True)
    collection.create_index([("date_joined", DESCENDING)])
    return collection


def get_order_history_collection():
    collection = get_database()["order_history"]
    collection.create_index([("admin_order_id", ASCENDING)], unique=True, sparse=True)
    collection.create_index([("user.django_user_id", ASCENDING)])
    collection.create_index([("created_at", DESCENDING)])
    collection.create_index([("status", ASCENDING)])
    return collection


def get_feedback_collection():
    collection = get_database()["feedback"]
    collection.create_index([("django_feedback_id", ASCENDING)], unique=True, sparse=True)
    collection.create_index([("target_type", ASCENDING)])
    collection.create_index([("status", ASCENDING)])
    collection.create_index([("created_at", DESCENDING)])
    collection.create_index([("user.django_user_id", ASCENDING)])
    collection.create_index([("product.django_product_id", ASCENDING)])
    return collection


def build_product_document(product):
    photo_url = ""
    if getattr(product, "photo", ""):
        try:
            photo_url = product.photo.url
        except ValueError:
            photo_url = ""

    return {
        "django_product_id": product.id,
        "name": product.name,
        "price": int(product.price),
        "flower_price": int(product.flower_price or product.price or 0),
        "bouquet_price": int(product.bouquet_price or product.flower_price or product.price or 0),
        "description": product.description,
        "category": product.category or "Floral",
        "image": photo_url,
        "photo_url": photo_url,
        "old_price": None,
        "updated_at": timezone.now(),
    }


def build_user_document(user):
    return {
        "django_user_id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": user.get_full_name().strip() or user.username,
        "is_staff": bool(user.is_staff),
        "is_superuser": bool(user.is_superuser),
        "is_active": bool(user.is_active),
        "date_joined": user.date_joined,
        "last_login": user.last_login,
        "updated_at": timezone.now(),
    }


def build_order_history_document(order):
    user = order.user if isinstance(order.user, User) else None
    delivery_date = order.delivery_date.isoformat() if order.delivery_date else ""
    return {
        "admin_order_id": order.id,
        "mongo_order_id": order.mongo_order_id,
        "user": {
            "django_user_id": user.id if user else None,
            "username": user.username if user else "",
            "email": user.email if user else "",
            "full_name": user.get_full_name().strip() if user else "",
        },
        "customer": {
            "name": order.name,
            "phone": order.phone,
            "address": order.address,
            "city": order.city,
            "pincode": order.pincode,
        },
        "items": order.items,
        "item_count": sum(int(item.get("qty", 1)) for item in order.items if isinstance(item, dict)),
        "status": order.status,
        "delivery": {
            "date": delivery_date,
            "slot": order.delivery_slot,
            "same_day_delivery": bool(order.same_day_delivery),
            "gift_message": order.gift_message,
            "occasion": order.occasion,
            "tracking_status": order.delivery_status,
        },
        "total_amount": int(order.total_amount),
        "payment_order_id": order.payment_order_id,
        "payment_id": order.payment_id,
        "created_at": order.created_at,
        "updated_at": timezone.now(),
    }


def build_feedback_document(feedback):
    user = feedback.user if isinstance(feedback.user, User) else None
    product = feedback.product
    return {
        "django_feedback_id": feedback.id,
        "target_type": feedback.target_type,
        "rating": int(feedback.rating),
        "title": feedback.title,
        "message": feedback.message,
        "status": feedback.status,
        "user": {
            "django_user_id": user.id if user else None,
            "username": user.username if user else "",
            "email": user.email if user else "",
            "full_name": user.get_full_name().strip() if user else "",
        },
        "product": {
            "django_product_id": product.id if product else None,
            "name": product.name if product else "",
            "category": product.category if product else "",
        },
        "created_at": feedback.created_at,
        "updated_at": timezone.now(),
    }


def sync_product_to_mongo(product):
    collection = get_products_collection()
    document = build_product_document(product)

    existing = collection.find_one({"django_product_id": product.id}, {"_id": 1})
    if existing:
        collection.update_one({"_id": existing["_id"]}, {"$set": document}, upsert=True)
        return

    legacy_match = collection.find_one(
        {"name": product.name, "category": product.category or "Floral"},
        {"_id": 1},
    )
    if legacy_match:
        collection.update_one({"_id": legacy_match["_id"]}, {"$set": document}, upsert=True)
        return

    collection.update_one(
        {"django_product_id": product.id},
        {"$set": document},
        upsert=True,
    )


def sync_user_to_mongo(user):
    collection = get_users_collection()
    document = build_user_document(user)
    collection.update_one(
        {"django_user_id": user.id},
        {"$set": document},
        upsert=True,
    )


def sync_order_history_to_mongo(order):
    collection = get_order_history_collection()
    document = build_order_history_document(order)
    collection.update_one(
        {"admin_order_id": order.id},
        {"$set": document},
        upsert=True,
    )


def sync_feedback_to_mongo(feedback):
    collection = get_feedback_collection()
    document = build_feedback_document(feedback)
    collection.update_one(
        {"django_feedback_id": feedback.id},
        {"$set": document},
        upsert=True,
    )


def delete_product_from_mongo(product):
    collection = get_products_collection()
    delete_result = collection.delete_one({"django_product_id": product.id})
    if delete_result.deleted_count == 0:
        collection.delete_one(
            {"name": product.name, "category": product.category or "Floral"}
        )


def delete_user_from_mongo(user):
    collection = get_users_collection()
    collection.delete_one({"django_user_id": user.id})


def delete_order_history_from_mongo(order):
    collection = get_order_history_collection()
    collection.delete_one({"admin_order_id": order.id})


def delete_feedback_from_mongo(feedback):
    collection = get_feedback_collection()
    collection.delete_one({"django_feedback_id": feedback.id})
