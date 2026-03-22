import pymongo
from bson import ObjectId

client = pymongo.MongoClient("mongodb://127.0.0.1:27017/")
db = client["petalsflora"]
collection = db["products"]

products = [
    {"name": "Tajmahal Rose", "price": 350, "old_price": 400, "description": "Premium red roses with a royal touch.", "category": "Roses"},
    {"name": "Purple Rose", "price": 300, "old_price": 350, "description": "Elegant purple roses for special occasions.", "category": "Roses"},
    {"name": "Emma Rose", "price": 300, "old_price": 350, "description": "Soft pink Emma roses.", "category": "Roses"},
    {"name": "Gold Strike", "price": 300, "old_price": 350, "description": "Bright yellow Gold Strike roses.", "category": "Roses"},
    {"name": "NOBBLESE", "price": 300, "old_price": 350, "description": "Classic Noblesse pink roses.", "category": "Roses"},
    {"name": "Blue Daisy", "price": 150, "old_price": 200, "description": "Vibrant blue daisies.", "category": "Gerbera"},
    {"name": "White Daisy", "price": 150, "old_price": 200, "description": "Pure white daisies.", "category": "Gerbera"},
    {"name": "Yellow Daisy", "price": 150, "old_price": 200, "description": "Sunny yellow daisies.", "category": "Gerbera"},
    {"name": "Red Rose Bouquet", "price": 1200, "old_price": 1500, "description": "A grand bouquet of red roses.", "category": "Bouquet"},
    {"name": "Asiatic Lily", "price": 450, "old_price": 500, "description": "Exotic Asiatic lilies.", "category": "Asiatic Lily"},
]

collection.delete_many({}) 
collection.insert_many(products)
print("Database populated successfully.")
