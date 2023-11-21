import hashValue from "hash-value";

const RAINBOW = [
  "#4F1D6A",
  "#531F6C",
  "#7A1E7A",
  "#7D265A",
  "#A02C5A",
  "#B22C46",
  "#BD303A",
  "#C93E2B",
  "#CF502E",
  "#D66C1E",
  "#D47827",
  "#DFAF2B",
  "#DBB01E",
  "#D8C617",
  "#DFCE19",
  "#C9D025",
  "#79C846",
  "#61BB5A",
  "#3FAA49",
  "#3FAA49",
  "#459996",
  "#2A72AE",
  "#254C9A",
  "#2A1468",
];

const GOLDS = [
  "#393B33",
  "#46483F",
  "#51544A",
  "#5D6055",

  "#828578",
  "#8F9284",
  "#999E8E",
  "#A6AA9A",
];

const SILVERS = [
  "#34363C",
  "#3F4147",
  "#4A4D54",
  "#555860",

  "#777C85",
  "#838992",
  "#8E949E",
  "#99A0AA",
];

const SLATES = [
  "#393B41",
  "#444048",
  "#4F4A54",
  "#5B5660",

  "#7F7885",
  "#8B8492",
  "#968F9E",
  "#A29AAB",
];

const COLORS = [...RAINBOW, ...SLATES, ...GOLDS, ...SILVERS];

export default function getProductColor(product?: string) {
  if (!product) return;

  return hashValue(product, COLORS);
}
