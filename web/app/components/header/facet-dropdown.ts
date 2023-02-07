import Component from "@glimmer/component";
import { action } from "@ember/object";
import { FacetDropdownObjects } from "hermes/types/facets";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";

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
  @service declare router: RouterService;

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

  get currentRouteName(): string {
    console.log(this.router.currentRouteName);

    return this.router.currentRouteName;
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
