import Helper from "@ember/component/helper";
import { inject as service } from "@ember/service";
import ProductAreasService from "hermes/services/product-areas";

export interface GetProductAbbreviationHelperSignature {
  Args: {
    Positional: [productName?: string];
  };
  Return: string;
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

  compute([productName]: [string | undefined]): string {
    if (!productName) {
      return "";
    }

    //  need to search the productAreas index for an object called `productName` and return the abbreviation
    const products = this.productAreas.index;
    const product = products?.[productName];

    if (!product) {
      return "";
    }

    return product.abbreviation.slice(0, 3).toUpperCase();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-doc-abbreviation": typeof GetProductAbbreviationHelper;
  }
}
