import { MirageTestContext } from "ember-cli-mirage/test-support";
import ProductAreasService from "hermes/services/product-areas";

export function startFactories(mirage: MirageTestContext) {
  mirage.server.create("product");
}

export const setupProductIndex = async (mirage: MirageTestContext) => {
  const productAreas = mirage.owner.lookup(
    "service:product-areas",
  ) as ProductAreasService;

  await productAreas.fetch.perform();
};
