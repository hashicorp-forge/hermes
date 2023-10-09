import { ProductArea } from "hermes/services/product-areas";

export default function getProductAbbreviation(
  index: Record<string, ProductArea>,
  productName?: string,
) {
  if (!productName) {
    return;
  }

  const product = index[productName];

  if (!product) {
    return;
  }

  return product.abbreviation.slice(0, 3).toUpperCase();
}
