import { helper } from "@ember/component/helper";
import getProductLabel from "hermes/utils/get-product-label";

export interface GetProductLabelSignature {
  Args: {
    Positional: [string | undefined];
  };
  Return: string;
}

const getProductLabelHelper = helper<GetProductLabelSignature>(([product]) => {
  return getProductLabel(product);
});

export default getProductLabelHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-product-label": typeof getProductLabelHelper;
  }
}
