CATALOG_GROUPS = {
    "Roses": [
        "Tajmahal",
        "Purple Rose",
        "Emma Rose",
        "Gold Strike",
        "Noblesse",
        "Buggati",
        "Corvette",
        "Peach",
        "Tropical Amazon (TA)",
        "White",
        "Confetti",
        "Soverign",
    ],
    "Carnations": [
        "White",
        "Green",
        "Double Colour",
        "Purple",
        "Red",
        "Dark Pink",
        "Orange",
        "Spray Carnation",
        "Light Pink",
    ],
    "Asiatic Lilies": [
        "Pink",
        "White",
        "Orange",
        "Red",
        "Yellow",
        "Tube Rose",
    ],
    "Exotic & Novelties": [
        "Anthurium Double Colour",
        "Ginger Lilly",
        "Anthurium",
        "Agapanthus White",
        "Agapanthus Blue",
        "Brassica",
        "Straight Heliconia",
        "Golden Torch Heliconia",
        "Bird of Paradise",
        "Rattle Shaker",
        "Musa Banana Flower",
        "Pineapple",
        "Callalily",
        "Sexy Pink Heliconia",
        "Bromidos",
        "Torch Ginger",
        "Hydrangea",
        "Shampoo Ginger",
    ],
    "Gerberas": [
        "White",
        "Yellow",
        "Red",
        "Dark Pink",
        "Double Color",
        "Light Pink",
        "Half White",
        "Peach",
        "Orange",
    ],
    "Orchids": [
        "White/Purple",
        "Blue Dyed",
        "Red Mokara",
        "Pink Mokara",
        "Yellow Mokara Dot / Plain",
        "Green Mokara",
    ],
    "Oriental Lilies": [
        "Pink",
        "Yellow",
        "White",
    ],
    "Fillers": [
        "Blue Daisy",
        "White Daisy",
        "Yellow Daisy",
        "Gypsophila",
        "Alstroemeria",
        "Yellow Button",
    ],
    "Cut Foliages": [
        "Mayers",
        "Asparagus",
        "Anthurium Leaves",
        "Tree Fern",
        "Fish Leaves",
        "Song of Jamaica",
        "Song of India",
        "Kolkata Asparagas",
        "Kamini",
        "Spider",
        "Dracena",
        "Ivy Leaves",
        "Silver Dollar",
        "Areca/Market Palm",
        "Golden Rod",
        "Cypres",
        "Monstera",
        "Leather Leaves",
        "Xanadu",
        "Limonium",
        "Ming Fern",
        "Money Plant",
        "BOP Leaves",
        "Podo Carpus",
        "Ribbon Grass",
    ],
    "Hybrid Chrysanthamums": [
        "Double Colour",
        "Dark Pink Spray",
        "Light Pink Spray",
        "White Spray",
        "Red Spray",
        "Orange Spray",
        "Yellow Spray",
        "Yellow Button",
        "White Button",
        "Green Button",
        "Spider",
        "Double colour",
    ],
    "Bouquet & Car Deco Materials": [
        "Bridal Handle",
        "Bouquet Sheet",
        "Dry Flowers",
        "Square Petite",
        "Jute Wrapper",
        "Auto Deco Round",
        "Auto Deco Square",
        "Foam Box",
        "Car deco materials",
    ],
    "Real Flower Bouquets": [
        "Rose Bouquet",
        "Lily Bouquet",
        "Orchid Bouquet",
        "Tulip Bouquet",
        "Mixed Flower Bouquet",
        "Sunflower Bouquet",
    ],
    "Artificial Flower Bouquets": [
        "Silk Flower Bouquet",
        "Foam Flower Bouquet",
        "Paper Flower Bouquet",
        "Crochet Flower Bouquet",
        "Wooden Flower Bouquet",
    ],
    "Chocolate Bouquets": [
        "Chocolate Bouquet",
        "Ferrero Rocher Bouquet",
        "Dairy Milk Bouquet",
        "Kinder Chocolate Bouquet",
        "Chocolate Flower Combo Bouquet",
    ],
    "Jewelry Bouquets": [
        "Earring Bouquet",
        "Bracelet Bouquet",
        "Ring Bouquet",
        "Jewelry Combo Bouquet",
    ],
    "Gift Bouquets": [
        "Teddy Bear Bouquet",
        "Money Bouquet",
        "Snack Bouquet",
        "Cosmetic Bouquet",
        "Stationery Bouquet",
    ],
    "Handmade Bouquets": [
        "Origami Bouquet",
        "Photo Memory Bouquet",
        "Message Bouquet",
        "Fabric Bouquet",
    ],
    "Occasion Bouquets": [
        "Birthday Bouquet",
        "Wedding Bouquet",
        "Anniversary Bouquet",
        "Graduation Bouquet",
        "Baby Shower Bouquet",
    ],
    "Innovative Bouquets": [
        "LED Light Bouquet",
        "Balloon Bouquet",
        "Perfume Bouquet",
        "Cupcake Bouquet",
        "Fruit Bouquet",
        "Book Bouquet",
        "Personalized Name Bouquet",
    ],
}

CATEGORY_PRICE_DEFAULTS = {
    "Roses": {"flower": 80, "bouquet": 699},
    "Carnations": {"flower": 45, "bouquet": 549},
    "Asiatic Lilies": {"flower": 160, "bouquet": 999},
    "Oriental Lilies": {"flower": 220, "bouquet": 1299},
    "Exotic & Novelties": {"flower": 180, "bouquet": 1199},
    "Gerberas": {"flower": 60, "bouquet": 599},
    "Orchids": {"flower": 180, "bouquet": 1199},
    "Fillers": {"flower": 35, "bouquet": 399},
    "Cut Foliages": {"flower": 30, "bouquet": 349},
    "Hybrid Chrysanthamums": {"flower": 55, "bouquet": 549},
    "Bouquet & Car Deco Materials": {"flower": 75, "bouquet": 299},
    "Real Flower Bouquets": {"flower": 699, "bouquet": 699},
    "Artificial Flower Bouquets": {"flower": 799, "bouquet": 799},
    "Chocolate Bouquets": {"flower": 899, "bouquet": 899},
    "Jewelry Bouquets": {"flower": 1299, "bouquet": 1299},
    "Gift Bouquets": {"flower": 999, "bouquet": 999},
    "Handmade Bouquets": {"flower": 899, "bouquet": 899},
    "Occasion Bouquets": {"flower": 1199, "bouquet": 1199},
    "Innovative Bouquets": {"flower": 1399, "bouquet": 1399},
}


def get_catalog_prices(category, item_index=0):
    defaults = CATEGORY_PRICE_DEFAULTS.get(category, {"flower": 75, "bouquet": 599})
    variation = (int(item_index) % 5) * 10
    flower_price = defaults["flower"] + variation
    bouquet_price = max(defaults["bouquet"] + variation * 4, flower_price)
    return flower_price, bouquet_price


def build_catalog_products():
    products = []

    for index, (category, names) in enumerate(CATALOG_GROUPS.items(), start=1):
        for item_index, name in enumerate(names, start=1):
            flower_price, bouquet_price = get_catalog_prices(category, item_index - 1)
            products.append(
                {
                    "id": f"catalog-{index:02d}-{item_index:02d}",
                    "name": name,
                    "price": flower_price,
                    "flower_price": flower_price,
                    "bouquet_price": bouquet_price,
                    "old_price": None,
                    "description": f"{name} from the {category} collection.",
                    "category": category,
                }
            )

    return products


CATALOG_PRODUCTS = build_catalog_products()


def build_seed_products():
    return [
        {
            "name": item["name"],
            "price": item["price"],
            "flower_price": item["flower_price"],
            "bouquet_price": item["bouquet_price"],
            "old_price": item["old_price"],
            "description": item["description"],
            "category": item["category"],
        }
        for item in CATALOG_PRODUCTS
    ]
