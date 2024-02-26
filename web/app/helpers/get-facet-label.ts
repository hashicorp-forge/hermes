import Helper from "@ember/component/helper";
import { FacetName } from "hermes/components/header/toolbar";

interface GetFacetLabelHelperSignature {
  Args: {
    Positional: [facetName: FacetName];
  };
  Return: string;
}
/**
 *
 */
export default class GetFacetLabelHelper extends Helper<GetFacetLabelHelperSignature> {
  compute(positional: GetFacetLabelHelperSignature["Args"]["Positional"]) {
    const [facetName] = positional;

    switch (facetName) {
      case FacetName.DocType:
        return "Type";
      case FacetName.Owners:
        return "Owners";
      case FacetName.Status:
        return "Status";
      case FacetName.Product:
        return "Product/Area";
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
