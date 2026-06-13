import agapanthus_blue from "../assets/flowers/Agapanthus Blue.png";
import agapanthus_white from "../assets/flowers/Agapanthus white.png";
import anthurium_double from "../assets/flowers/Anthurium Double.png";
import anthurium_leaves from "../assets/flowers/Anthurium Leaves.png";
import anthurium from "../assets/flowers/Anthurium.png";
import auto_deco_round_flower from "../assets/flowers/Auto Deco Round flower.png";
import auto_deco_square from "../assets/flowers/Auto Deco Square.png";
import bird_of_paradise from "../assets/flowers/Bird of Paradise.png";
import bouquet_sheet from "../assets/flowers/Bouquet Sheet.png";
import brassica from "../assets/flowers/Brassica.png";
import callalily from "../assets/flowers/Callalily.png";
import car_deco_materials from "../assets/flowers/Car deco materials.png";
import confetti from "../assets/flowers/Confetti.png";
import dry_flowers from "../assets/flowers/Dry Flowers.png";
import foam_box from "../assets/flowers/Foam Box.png";
import ginger_lilly from "../assets/flowers/Ginger Lilly.png";
import golden_torch_heliconia from "../assets/flowers/Golden Torch Heliconia.png";
import hydrangea from "../assets/flowers/Hydrangea.png";
import jute_wrapper from "../assets/flowers/Jute Wrapper.png";
import musa_banana_flower from "../assets/flowers/Musa Banana Flower.png";
import peach from "../assets/flowers/Peach.png";
import pineapple from "../assets/flowers/Pineapple.png";
import rattle_shaker from "../assets/flowers/Rattle Shaker.png";
import sexy_pink_heliconia from "../assets/flowers/Sexy Pink Heliconia.png";
import shampoo_ginger from "../assets/flowers/Shampoo Ginger.png";
import soverign from "../assets/flowers/Soverign.png";
import square_petite from "../assets/flowers/Square Petite.png";
import straight_heliconia from "../assets/flowers/Straight Heliconia.png";
import torch_ginger from "../assets/flowers/Torch Ginger.png";
import tropical_amazon from "../assets/flowers/Tropical amazon.png";
import bridal_handle from "../assets/flowers/bridal handle.png";
import bromidos from "../assets/flowers/bromides.png";
import buggati_rose from "../assets/flowers/buggati_rose.png";
import corvette_rose from "../assets/flowers/corvette_rose.png";
import emma_rose from "../assets/flowers/emma_rose.png";
import gold_strike_rose from "../assets/flowers/gold_strike_rose.png";
import noblesse_rose from "../assets/flowers/noblesse_rose.png";
import purple_rose from "../assets/flowers/purple_rose.png";
import tajmahal_rose from "../assets/flowers/tajmahal_rose.png";
import white from "../assets/flowers/white.png";

// Verified high-quality floral photography IDs and local assets for categories
const CATEGORY_DEFAULTS = {
  Roses: null,
  Carnations: null,
  "Asiatic Lilies": null,
  "Exotic & Novelties": null,
  Gerberas: null,
  Orchids: null,
  "Oriental Lilies": null,
  Fillers: null,
  "Cut Foliages": null,
  "Hybrid Chrysanthamums": null,
  "Bouquet & Car Deco Materials": null,
  "Real Flower Bouquets": null,
  "Artificial Flower Bouquets": null,
  "Chocolate Bouquets": null,
  "Jewelry Bouquets": null,
  "Gift Bouquets": null,
  "Handmade Bouquets": null,
  "Occasion Bouquets": null,
  "Innovative Bouquets": null,
};

export const PRODUCT_SPECIFIC_IMAGES = {
  "Exotic & Novelties:Agapanthus Blue": agapanthus_blue,
  "Exotic & Novelties:Agapanthus White": agapanthus_white,
  "Exotic & Novelties:Anthurium Double Colour": anthurium_double,
  "Cut Foliages:Anthurium Leaves": anthurium_leaves,
  "Exotic & Novelties:Anthurium": anthurium,
  "Bouquet & Car Deco Materials:Auto Deco Round": auto_deco_round_flower,
  "Bouquet & Car Deco Materials:Auto Deco Square": auto_deco_square,
  "Exotic & Novelties:Bird of Paradise": bird_of_paradise,
  "Bouquet & Car Deco Materials:Bouquet Sheet": bouquet_sheet,
  "Exotic & Novelties:Brassica": brassica,
  "Exotic & Novelties:Callalily": callalily,
  "Bouquet & Car Deco Materials:Car deco materials": car_deco_materials,
  "Roses:Confetti": confetti,
  "Bouquet & Car Deco Materials:Dry Flowers": dry_flowers,
  "Bouquet & Car Deco Materials:Foam Box": foam_box,
  "Exotic & Novelties:Ginger Lilly": ginger_lilly,
  "Exotic & Novelties:Golden Torch Heliconia": golden_torch_heliconia,
  "Exotic & Novelties:Hydrangea": hydrangea,
  "Bouquet & Car Deco Materials:Jute Wrapper": jute_wrapper,
  "Exotic & Novelties:Musa Banana Flower": musa_banana_flower,
  "Roses:Peach": peach,
  "Exotic & Novelties:Pineapple": pineapple,
  "Exotic & Novelties:Rattle Shaker": rattle_shaker,
  "Exotic & Novelties:Sexy Pink Heliconia": sexy_pink_heliconia,
  "Exotic & Novelties:Shampoo Ginger": shampoo_ginger,
  "Roses:Soverign": soverign,
  "Bouquet & Car Deco Materials:Square Petite": square_petite,
  "Exotic & Novelties:Straight Heliconia": straight_heliconia,
  "Exotic & Novelties:Torch Ginger": torch_ginger,
  "Roses:Tropical Amazon (TA)": tropical_amazon,
  "Bouquet & Car Deco Materials:Bridal Handle": bridal_handle,
  "Exotic & Novelties:Bromidos": bromidos,
  "Roses:Buggati": buggati_rose,
  "Roses:Corvette": corvette_rose,
  "Roses:Emma Rose": emma_rose,
  "Roses:Gold Strike": gold_strike_rose,
  "Roses:Noblesse": noblesse_rose,
  "Roses:Purple Rose": purple_rose,
  "Roses:Tajmahal": tajmahal_rose,
  "Roses:White": white,
};

// Map all other items to their category defaults
const catalogGroupsItems = {
  Roses: ["Tajmahal", "Purple Rose", "Emma Rose", "Gold Strike", "Noblesse", "Buggati", "Corvette", "Peach", "Tropical Amazon (TA)", "White", "Confetti", "Soverign"],
  Carnations: ["White", "Green", "Double Colour", "Purple", "Red", "Dark Pink", "Orange", "Spray Carnation", "Light Pink"],
  "Asiatic Lilies": ["Pink", "White", "Orange", "Red", "Yellow", "Tube Rose"],
  "Exotic & Novelties": ["Anthurium Double Colour", "Ginger Lilly", "Anthurium", "Agapanthus White", "Agapanthus Blue", "Brassica", "Straight Heliconia", "Golden Torch Heliconia", "Bird of Paradise", "Rattle Shaker", "Musa Banana Flower", "Pineapple", "Callalily", "Sexy Pink Heliconia", "Bromidos", "Torch Ginger", "Hydrangea", "Shampoo Ginger"],
  Gerberas: ["White", "Yellow", "Red", "Dark Pink", "Double Color", "Light Pink", "Half White", "Peach", "Orange"],
  Orchids: ["White/Purple", "Blue Dyed", "Red Mokara", "Pink Mokara", "Yellow Mokara Dot / Plain", "Green Mokara"],
  "Oriental Lilies": ["Pink", "Yellow", "White"],
  Fillers: ["Blue Daisy", "White Daisy", "Yellow Daisy", "Gypsophila", "Alstroemeria", "Yellow Button"],
  "Cut Foliages": ["Mayers", "Asparagus", "Anthurium Leaves", "Tree Fern", "Fish Leaves", "Song of Jamaica", "Song of India", "Kolkata Asparagas", "Kamini", "Spider", "Dracena", "Ivy Leaves", "Silver Dollar", "Areca/Market Palm", "Golden Rod", "Cypres", "Monstera", "Leather Leaves", "Xanadu", "Limonium", "Ming Fern", "Money Plant", "BOP Leaves", "Podo Carpus", "Ribbon Grass"],
  "Hybrid Chrysanthamums": ["Double Colour", "Dark Pink Spray", "Light Pink Spray", "White Spray", "Red Spray", "Orange Spray", "Yellow Spray", "Yellow Button", "White Button", "Green Button", "Spider", "Double colour"],
  "Bouquet & Car Deco Materials": ["Bridal Handle", "Bouquet Sheet", "Dry Flowers", "Square Petite", "Jute Wrapper", "Auto Deco Round", "Auto Deco Square", "Foam Box", "Car deco materials"],
  "Real Flower Bouquets": ["Rose Bouquet", "Lily Bouquet", "Orchid Bouquet", "Tulip Bouquet", "Mixed Flower Bouquet", "Sunflower Bouquet"],
  "Artificial Flower Bouquets": ["Silk Flower Bouquet", "Foam Flower Bouquet", "Paper Flower Bouquet", "Crochet Flower Bouquet", "Wooden Flower Bouquet"],
  "Chocolate Bouquets": ["Chocolate Bouquet", "Ferrero Rocher Bouquet", "Dairy Milk Bouquet", "Kinder Chocolate Bouquet", "Chocolate Flower Combo Bouquet"],
  "Jewelry Bouquets": ["Earring Bouquet", "Bracelet Bouquet", "Ring Bouquet", "Jewelry Combo Bouquet"],
  "Gift Bouquets": ["Teddy Bear Bouquet", "Money Bouquet", "Snack Bouquet", "Cosmetic Bouquet", "Stationery Bouquet"],
  "Handmade Bouquets": ["Origami Bouquet", "Photo Memory Bouquet", "Message Bouquet", "Fabric Bouquet"],
  "Occasion Bouquets": ["Birthday Bouquet", "Wedding Bouquet", "Anniversary Bouquet", "Graduation Bouquet", "Baby Shower Bouquet"],
  "Innovative Bouquets": ["LED Light Bouquet", "Balloon Bouquet", "Perfume Bouquet", "Cupcake Bouquet", "Fruit Bouquet", "Book Bouquet", "Personalized Name Bouquet"]
};

Object.entries(catalogGroupsItems).forEach(([category, items]) => {
  items.forEach(item => {
    const key = `${category}:${item}`;
    if (!PRODUCT_SPECIFIC_IMAGES[key]) {
      PRODUCT_SPECIFIC_IMAGES[key] = CATEGORY_DEFAULTS[category];
    }
  });
});



const catalogGroups = {
  Roses: [
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
  Carnations: [
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
  Gerberas: [
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
  Orchids: [
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
  Fillers: [
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
};

const CATEGORY_IMAGES = {
  "Roses": null,
  "Carnations": null,
  "Asiatic Lilies": null,
  "Oriental Lilies": null,
  "Exotic & Novelties": null,
  "Gerberas": null,
  "Orchids": null,
  "Fillers": null,
  "Cut Foliages": null,
  "Hybrid Chrysanthamums": null,
  "Bouquet & Car Deco Materials": null,
  "Real Flower Bouquets": null,
  "Artificial Flower Bouquets": null,
  "Chocolate Bouquets": null,
  "Jewelry Bouquets": null,
  "Gift Bouquets": null,
  "Handmade Bouquets": null,
  "Occasion Bouquets": null,
  "Innovative Bouquets": null,
};

const CATEGORY_PRICE_DEFAULTS = {
  Roses: { flower: 80, bouquet: 699 },
  Carnations: { flower: 45, bouquet: 549 },
  "Asiatic Lilies": { flower: 160, bouquet: 999 },
  "Oriental Lilies": { flower: 220, bouquet: 1299 },
  "Exotic & Novelties": { flower: 180, bouquet: 1199 },
  Gerberas: { flower: 60, bouquet: 599 },
  Orchids: { flower: 180, bouquet: 1199 },
  Fillers: { flower: 35, bouquet: 399 },
  "Cut Foliages": { flower: 30, bouquet: 349 },
  "Hybrid Chrysanthamums": { flower: 55, bouquet: 549 },
  "Bouquet & Car Deco Materials": { flower: 75, bouquet: 299 },
  "Real Flower Bouquets": { flower: 699, bouquet: 699 },
  "Artificial Flower Bouquets": { flower: 799, bouquet: 799 },
  "Chocolate Bouquets": { flower: 899, bouquet: 899 },
  "Jewelry Bouquets": { flower: 1299, bouquet: 1299 },
  "Gift Bouquets": { flower: 999, bouquet: 999 },
  "Handmade Bouquets": { flower: 899, bouquet: 899 },
  "Occasion Bouquets": { flower: 1199, bouquet: 1199 },
  "Innovative Bouquets": { flower: 1399, bouquet: 1399 },
};

export function getCatalogPrices(category, itemIndex = 0) {
  const defaults = CATEGORY_PRICE_DEFAULTS[category] || { flower: 75, bouquet: 599 };
  const variation = (Number(itemIndex) % 5) * 10;
  const flowerPrice = defaults.flower + variation;
  const bouquetPrice = Math.max(defaults.bouquet + variation * 4, flowerPrice);

  return {
    flowerPrice,
    bouquetPrice,
  };
}

export const catalogProducts = Object.entries(catalogGroups).flatMap(([category, names], groupIndex) =>
  names.map((name, itemIndex) => {
    const prices = getCatalogPrices(category, itemIndex);

    return {
      id: `catalog-${groupIndex + 1}-${itemIndex + 1}`,
      name,
      category,
      price: prices.flowerPrice,
      flowerPrice: prices.flowerPrice,
      bouquetPrice: prices.bouquetPrice,
      old_price: null,
      description: `${name} from the ${category} collection.`,
      professional_image: PRODUCT_SPECIFIC_IMAGES[`${category}:${name}`] || PRODUCT_SPECIFIC_IMAGES[name] || CATEGORY_IMAGES[category] || null
    };
  })
);

