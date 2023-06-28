import { helper } from "@ember/component/helper";
import getProductId from "hermes/utils/get-product-id";

export interface GetProductIDSignature {
  Args: {
    Positional: [string | undefined];
  };
  Return: string | null;
}

const getProductIDHelper = helper<GetProductIDSignature>(([productName]) => {
  if (!productName) {
    return null;
  }
  return getProductId(productName);
});

export default getProductIDHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-product-id": typeof getProductIDHelper;
  }
}
