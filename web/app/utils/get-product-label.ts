export default function getProductLabel(product?: string) {
  if (!product) {
    return "Unknown";
  }

  switch (product) {
    case "Cloud Platform":
      return "HCP";
    default:
      return product;
  }
}
