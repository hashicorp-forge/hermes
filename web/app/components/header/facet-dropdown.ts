import Component from "@glimmer/component";
import { action } from "@ember/object";
import { FacetDropdownObjects, FacetNames } from "hermes/types/facets";

interface FacetDropdownComponentSignature {
  Args: {
    onClick: (facetName: FacetNames, value: string) => void;
    label: string;
    facets: FacetDropdownObjects;
    disabled: boolean;
  };
}

export default class FacetDropdownComponent extends Component<FacetDropdownComponentSignature> {
  get facetName(): FacetNames | undefined {
    switch (this.args.label) {
      case "Type":
        return FacetNames.DocType;
      case "Status":
        return FacetNames.Status;
      case "Product/Area":
        return FacetNames.Product;
      case "Owner":
        return FacetNames.Owners;
    }
  }

  get firstTenFacets(): FacetDropdownObjects {
    let firstTenEntries = Object.entries(this.args.facets).slice(0, 10);
    let firstTenFacetsObjects = Object.fromEntries(firstTenEntries);
    return firstTenFacetsObjects;
  }

  @action onClick(value: string, close: () => void) {
    if (this.facetName) {
      this.args.onClick(this.facetName, value);
    }
    close();
  }
}
