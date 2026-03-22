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
}


def build_catalog_products():
    products = []

    for index, (category, names) in enumerate(CATALOG_GROUPS.items(), start=1):
        for item_index, name in enumerate(names, start=1):
            products.append(
                {
                    "id": f"catalog-{index:02d}-{item_index:02d}",
                    "name": name,
                    "price": 0,
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
            "old_price": item["old_price"],
            "description": item["description"],
            "category": item["category"],
        }
        for item in CATALOG_PRODUCTS
    ]
