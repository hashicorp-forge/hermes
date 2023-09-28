import { helper } from "@ember/component/helper";
import getProductID from "hermes/utils/get-product-id";

export interface GetProductIDSignature {
  Args: {
    Positional: [string | undefined];
  };
  Return: string | undefined;
}

const getProductIDHelper = helper<GetProductIDSignature>(([productName]) => {
  if (!productName) {
    return;
  }
  return getProductID(productName);
});

export default getProductIDHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-product-id": typeof getProductIDHelper;
  }
}
