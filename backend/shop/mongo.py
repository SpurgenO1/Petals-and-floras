from pymongo import MongoClient
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import OperationFailure
from django.conf import settings
from django.utils import timezone


def get_products_collection():
    client = MongoClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]
    collection = db["products"]
    collection.create_index([("django_product_id", ASCENDING)], unique=True, sparse=True)
    collection.create_index([("updated_at", DESCENDING)])
    return collection


def get_orders_collection():
    client = MongoClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]
    collection = db["orders"]
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


def build_product_document(product):
    return {
        "django_product_id": product.id,
        "name": product.name,
        "price": int(product.price),
        "description": product.description,
        "category": product.category or "Floral",
        "old_price": None,
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


def delete_product_from_mongo(product):
    collection = get_products_collection()
    delete_result = collection.delete_one({"django_product_id": product.id})
    if delete_result.deleted_count == 0:
        collection.delete_one(
            {"name": product.name, "category": product.category or "Floral"}
        )
