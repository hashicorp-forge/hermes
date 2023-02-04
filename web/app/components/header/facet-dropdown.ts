import Component from "@glimmer/component";
import { action } from "@ember/object";
import { FacetDropdownObjects } from "hermes/types/facets";

interface FacetDropdownComponentSignature {
  Args: {
    onClick: (facetName: FacetName, value: string) => void;
    label: string;
    facets: FacetDropdownObjects;
    disabled: boolean;
  };
}

export enum FacetName {
  DocType = "docType",
  Owners = "owners",
  Status = "status",
  Product = "product",
}

export default class FacetDropdownComponent extends Component<FacetDropdownComponentSignature> {
  get facetName(): FacetName | undefined {
    switch (this.args.label) {
      case "Type":
        return FacetName.DocType;
      case "Status":
        return FacetName.Status;
      case "Product/Area":
        return FacetName.Product;
      case "Owner":
        return FacetName.Owners;
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
