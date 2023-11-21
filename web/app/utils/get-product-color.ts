import hashValue from "hash-value";

const COLORS = [
  "#0c0c0e",
  "#3b3d45",
  "#656a76",
  "#8c909c",
  "#c2c5cb",
  "#f1f2f3",

  "#51130a",
  "#940004",
  "#c00005",
  "#fbd4d4",

  "#542800",
  "#803d00",
  "#9e4b00",
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
  "#cce3fe",
];

export default function getProductColor(product?: string) {
  if (!product) return;

  return hashValue(product, COLORS);
}
