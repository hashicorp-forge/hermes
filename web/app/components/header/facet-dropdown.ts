import Component from "@glimmer/component";
import { action } from "@ember/object";
import { FacetDropdownObjects } from "hermes/types/facets";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import { restartableTask } from "ember-concurrency";

interface FacetDropdownComponentSignature {
  Args: {
    onClick: (facetName: FacetNames, value: string) => void;
    label: string;
    facets: FacetDropdownObjects;
    disabled: boolean;
  };
}

export enum FacetNames {
  DocType = "docType",
  Owners = "owners",
  Status = "status",
  Product = "product",
}

export default class FacetDropdownComponent extends Component<FacetDropdownComponentSignature> {
  @service declare router: RouterService;
  @tracked protected dropdownIsShown = false;

  protected get inputIsShown() {
    return Object.entries(this.args.facets).length > 12;
  }

  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }
  @tracked query: string = "";
  @tracked shownFacets = this.args.facets;

  onInput = restartableTask(async (inputEvent: InputEvent) => {
    this.query = (inputEvent.target as HTMLInputElement).value;
    let facets = this.args.facets;
    let shownFacets: FacetDropdownObjects = {};
    for (const [key, value] of Object.entries(facets)) {
      if (key.toLowerCase().includes(this.query.toLowerCase())) {
        shownFacets[key] = value;
      }
    }
    this.shownFacets = shownFacets;
  });

  protected get facetName(): FacetNames | undefined {
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

  @action toggleDropdown() {
    if (this.dropdownIsShown) {
      this.hideDropdown();
    } else {
      this.dropdownIsShown = true;
    }
  }

  @action hideDropdown() {
    this.dropdownIsShown = false;
    this.query = "";
    this.shownFacets = this.args.facets;
  }

  @action onClick(value: string, close: () => void) {
    if (this.facetName) {
      this.args.onClick(this.facetName, value);
    }
    close();
  }
}
