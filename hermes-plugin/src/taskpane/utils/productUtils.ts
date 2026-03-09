/**
 * Get value from the provided `options` based on the hash of `source`.
 * Ported from Ember.js web implementation.
 * 
 * @param source String to hash.
 * @param options Collection of options to get value from.
 */
export function hashValue<T>(source: string, options: T[]): T | null {
  let hash = 0;
  if (source.length === 0 || options.length === 0) {
    return null;
  }
  for (let i = 0; i < source.length; i++) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  hash = ((hash % options.length) + options.length) % options.length;
  const res = options[hash];
  if (res === undefined) {
    return null;
  }
  return res as T;
}

/**
 * Get product ID for known HashiCorp products.
 * Returns the product identifier used for icon mapping.
 * Ported from Ember.js web implementation.
 */
export function getProductId(productName?: string): string | undefined {
  if (!productName) {
    return undefined;
  }
  let product = productName.toLowerCase();

  switch (product) {
    case "boundary":
    case "consul":
    case "nomad":
    case "packer":
    case "terraform":
    case "vagrant":
    case "vault":
    case "waypoint":
      return product;
    case "cloud platform":
      return "hcp";
    default:
      return undefined;
  }
}

// HDS color palette - same as Ember.js web implementation
const HDS_COLORS = [
  "#3b3d45",
  "#656a76", 
  "#c2c5cb",
  "#dedfe3",

  "#51130a",
  "#940004",
  "#c00005",
  "#fbd4d4",

  "#542800",
  "#803d00",
  "#9e4b00",
  "#bb5a00",
  "#fbeabf",

  "#054220",
  "#006619",
  "#00781e",
  "#cceeda",

  "#42215b",
  "#7b00db",
  "#911ced",
  "#ead2fe",

  "#1c345f",
  "#0046d1",
  "#0c56e9",
  "#1060ff",
  "#cce3fe",
];

const EXTENDED_COLORS = [
  "#ffd814",
  "#feec7b",
  "#fff9cf",

  "#d01c5b",
  "#ffcede",

  "#008196",
  "#62d4dc",

  "#63d0ff",
  "#d4f2ff",

  "#60dea9",
  "#d3fdeb",
];

/**
 * Get a hash-based color for a product area.
 * Used to provide consistent colors for product areas.
 * Ported from Ember.js web implementation.
 */
export function getProductColor(product?: string): string | null {
  if (!product) {
    return null;
  }

  return hashValue(product, [...HDS_COLORS, ...EXTENDED_COLORS]);
}

/**
 * Get font color (black or white) that contrasts with the given background color.
 * Simple implementation for readability.
 */
export function getContrastColor(backgroundColor: string): string {
  // Remove # if present
  const hex = backgroundColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light backgrounds, white for dark
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Convert a string to dasherized format (kebab-case).
 * Similar to Ember.js dasherize function.
 * Examples: "Cloud Infrastructure" -> "cloud-infrastructure"
 *           "Terraform" -> "terraform"
 */
export function dasherize(str: string): string {
  return str
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')  // Add dash before capital letters
    .replace(/\s+/g, '-')                    // Replace spaces with dashes
    .toLowerCase()                           // Convert to lowercase
    .replace(/[^a-z0-9\-]/g, '')            // Remove non-alphanumeric chars except dashes
    .replace(/-+/g, '-')                     // Replace multiple dashes with single dash
    .replace(/^-|-$/g, '');                  // Remove leading/trailing dashes
}