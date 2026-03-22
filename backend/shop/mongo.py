from pymongo import MongoClient
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import OperationFailure
from django.conf import settings


def get_products_collection():
    client = MongoClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]
    return db["products"]


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
