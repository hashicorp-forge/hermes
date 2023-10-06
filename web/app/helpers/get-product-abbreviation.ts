import Helper from "@ember/component/helper";
import { inject as service } from "@ember/service";
import ProductAreasService from "hermes/services/product-areas";

export interface GetProductAbbreviationHelperSignature {
  Args: {
    Positional: [productName?: string];
  };
  Return: string | null;
}

// const getProductAbbreviation = helper<GetProductAbbreviationHelperSignature>(
//   ([productName]: [string]) => {

//     const nameParts = productName.split("-");
//     const abbreviation = nameParts[0];

//     if (abbreviation) {
//       return abbreviation.slice(0, 3).toUpperCase();
//     }

//     return "";
//   },
// );

export default class GetProductAbbreviationHelper extends Helper<GetProductAbbreviationHelperSignature> {
  @service declare productAreas: ProductAreasService;

  compute([productName]: [string | undefined]): string | null {
    if (!productName) {
      return "";
    }

    const products = this.productAreas.index;
    const product = products?.[productName];

    if (!product) {
      return null;
    }

    return product.abbreviation.slice(0, 3).toUpperCase();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-product-abbreviation": typeof GetProductAbbreviationHelper;
  }
}
