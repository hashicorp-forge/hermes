export default function getProductId(
  productName: string | null
): string | null {
  if (!productName) {
    return null;
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
      return null;
  }
}
