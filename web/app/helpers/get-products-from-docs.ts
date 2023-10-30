import { helper } from "@ember/component/helper";
import { assert } from "@ember/debug";
import { HermesDocument } from "hermes/types/document";

export interface GetProductsFromDocsSignature {
  Args: {
    Positional: [docs: HermesDocument[]];
  };
  Return: string[] | undefined;
}

const getProductsFromDocs = helper<GetProductsFromDocsSignature>(([docs]) => {
  if (!docs) {
    return;
  }

  const products = docs
    .map((doc) => doc.product)
    .uniq()
    .reverse();

  assert(
    "products must be strings",
    products.every((product) => typeof product === "string"),
  );

  return products as string[];
});

export default getProductsFromDocs;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-products-from-docs": typeof getProductsFromDocs;
  }
}
