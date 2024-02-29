import Helper from "@ember/component/helper";
import { FacetName } from "hermes/components/header/toolbar";

export enum FacetLabel {
  DocType = "Type",
  Owners = "Owners",
  Status = "Status",
  Product = "Product/Area",
}

interface GetFacetLabelHelperSignature {
  Args: {
    Positional: [facetName: string];
  };
  Return: string;
}
/**
 * A helper to translate a facet name to a human-readable label.
 * E.g., `product` becomes `Product/Area`.
 * If the facet is not recognized, it returns as is.
 * Used in the filter dropdowns.
 */
export default class GetFacetLabelHelper extends Helper<GetFacetLabelHelperSignature> {
  compute(positional: GetFacetLabelHelperSignature["Args"]["Positional"]) {
    const [facetName] = positional;

    switch (facetName) {
      case FacetName.DocType:
        return FacetLabel.DocType;
      case FacetName.Owners:
        return FacetLabel.Owners;
      case FacetName.Status:
        return FacetLabel.Status;
      case FacetName.Product:
        return FacetLabel.Product;
      default:
        return facetName;
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-facet-label": typeof GetFacetLabelHelper;
  }
}
