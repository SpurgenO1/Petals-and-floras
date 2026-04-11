
import os

files = [
    "Agapanthus Blue.png", "Agapanthus white.png", "Anthurium Double.png",
    "Anthurium Leaves.png", "Anthurium.png", "Auto Deco Round flower.png",
    "Auto Deco Square.png", "Bird of Paradise.png", "Bouquet Sheet.png",
    "Brassica.png", "Callalily.png", "Car deco materials.png", "Confetti.png",
    "Dry Flowers.png", "Foam Box.png", "Ginger Lilly.png",
    "Golden Torch Heliconia.png", "Hydrangea.png", "Jute Wrapper.png",
    "Musa Banana Flower.png", "Peach.png", "Pineapple.png", "Rattle Shaker.png",
    "Sexy Pink Heliconia.png", "Shampoo Ginger.png", "Soverign.png",
    "Square Petite.png", "Straight Heliconia.png", "Torch Ginger.png",
    "Tropical amazon.png", "bridal handle.png", "bromides.png",
    "buggati_rose.png", "corvette_rose.png", "emma_rose.png",
    "gold_strike_rose.png", "noblesse_rose.png", "purple_rose.png",
    "tajmahal_rose.png", "white.png"
]

mapping = {
    "Agapanthus Blue.png": ("Exotic & Novelties", "Agapanthus Blue"),
    "Agapanthus white.png": ("Exotic & Novelties", "Agapanthus White"),
    "Anthurium Double.png": ("Exotic & Novelties", "Anthurium Double Colour"),
    "Anthurium Leaves.png": ("Cut Foliages", "Anthurium Leaves"),
    "Anthurium.png": ("Exotic & Novelties", "Anthurium"),
    "Auto Deco Round flower.png": ("Bouquet & Car Deco Materials", "Auto Deco Round"),
    "Auto Deco Square.png": ("Bouquet & Car Deco Materials", "Auto Deco Square"),
    "Bird of Paradise.png": ("Exotic & Novelties", "Bird of Paradise"),
    "Bouquet Sheet.png": ("Bouquet & Car Deco Materials", "Bouquet Sheet"),
    "Brassica.png": ("Exotic & Novelties", "Brassica"),
    "Callalily.png": ("Exotic & Novelties", "Callalily"),
    "Car deco materials.png": ("Bouquet & Car Deco Materials", "Car deco materials"),
    "Confetti.png": ("Roses", "Confetti"),
    "Dry Flowers.png": ("Bouquet & Car Deco Materials", "Dry Flowers"),
    "Foam Box.png": ("Bouquet & Car Deco Materials", "Foam Box"),
    "Ginger Lilly.png": ("Exotic & Novelties", "Ginger Lilly"),
    "Golden Torch Heliconia.png": ("Exotic & Novelties", "Golden Torch Heliconia"),
    "Hydrangea.png": ("Exotic & Novelties", "Hydrangea"),
    "Jute Wrapper.png": ("Bouquet & Car Deco Materials", "Jute Wrapper"),
    "Musa Banana Flower.png": ("Exotic & Novelties", "Musa Banana Flower"),
    "Peach.png": ("Roses", "Peach"),
    "Pineapple.png": ("Exotic & Novelties", "Pineapple"),
    "Rattle Shaker.png": ("Exotic & Novelties", "Rattle Shaker"),
    "Sexy Pink Heliconia.png": ("Exotic & Novelties", "Sexy Pink Heliconia"),
    "Shampoo Ginger.png": ("Exotic & Novelties", "Shampoo Ginger"),
    "Soverign.png": ("Roses", "Soverign"),
    "Square Petite.png": ("Bouquet & Car Deco Materials", "Square Petite"),
    "Straight Heliconia.png": ("Exotic & Novelties", "Straight Heliconia"),
    "Torch Ginger.png": ("Exotic & Novelties", "Torch Ginger"),
    "Tropical amazon.png": ("Roses", "Tropical Amazon (TA)"),
    "bridal handle.png": ("Bouquet & Car Deco Materials", "Bridal Handle"),
    "bromides.png": ("Exotic & Novelties", "Bromidos"),
    "buggati_rose.png": ("Roses", "Buggati"),
    "corvette_rose.png": ("Roses", "Corvette"),
    "emma_rose.png": ("Roses", "Emma Rose"),
    "gold_strike_rose.png": ("Roses", "Gold Strike"),
    "noblesse_rose.png": ("Roses", "Noblesse"),
    "purple_rose.png": ("Roses", "Purple Rose"),
    "tajmahal_rose.png": ("Roses", "Tajmahal"),
    "white.png": ("Roses", "White")
}

imports = []
entries = []

for filename in sorted(files):
    var_name = filename.lower().replace(" ", "_").replace(".", "_").replace("-", "_").replace("(", "").replace(")", "")
    if var_name.endswith("_png"):
        var_name = var_name[:-4]
    
    imports.append(f'import {var_name} from "../assets/flowers/{filename}";')
    
    if filename in mapping:
        category, name = mapping[filename]
        entries.append(f'  "{category}:{name}": {var_name},')

print("\n".join(imports))
print("\n")
print("\n".join(entries))
