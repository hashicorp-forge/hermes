import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import {
  FacetDropdownGroups,
  FacetDropdownObjectDetails,
  FacetDropdownObjects,
} from "hermes/types/facets";
import ActiveFiltersService from "hermes/services/active-filters";
import { next } from "@ember/runloop";
import { SearchScope } from "hermes/routes/authenticated/results";
import { assert } from "@ember/debug";
import {
  DocStatus,
  DocStatusLabel,
} from "hermes/routes/authenticated/document";
import DocumentTypesService from "hermes/services/document-types";
import ProductAreasService from "hermes/services/product-areas";
import { tracked } from "@glimmer/tracking";
import { restartableTask } from "ember-concurrency";
import { XDropdownListAnchorAPI } from "../x/dropdown-list";

export enum SortByValue {
  DateDesc = "dateDesc",
  DateAsc = "dateAsc",
}

export enum SortByLabel {
  Newest = "Newest",
  Oldest = "Oldest",
}

export enum FacetName {
  DocType = "docType",
  Owners = "owners",
  Status = "status",
  Product = "product",
}

export interface SortByFacets {
  [name: string]: {
    count: number;
    isSelected: boolean;
  };
}

interface FacetArrayItem {
  name: FacetName;
  values: FacetDropdownObjects | null;
}

export type ActiveFilters = {
  [name in FacetName]: string[];
};

interface ToolbarComponentSignature {
  Args: {
    facets?: Partial<FacetDropdownGroups>;
    scope?: SearchScope;
    query?: string;
  };
}

export default class ToolbarComponent extends Component<ToolbarComponentSignature> {
  @service declare router: RouterService;
  @service declare activeFilters: ActiveFiltersService;
  @service declare documentTypes: DocumentTypesService;
  @service declare productAreas: ProductAreasService;

  /**
   *
   */
  @tracked protected ownerQuery = "";

  /**
   *
   */
  @tracked protected ownerResults = [];

  get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  protected get ownerFacetIsShown() {
    return this.args.scope !== SearchScope.Projects;
  }

  /**
   * Whether the facets are shown.
   * True as long as the scope is not "All".
   */
  protected get facetsAreShown() {
    return this.args.scope !== SearchScope.All;
  }

  /**
   * The statuses available as filters.
   */
  protected get statuses(): FacetDropdownObjects {
    let statuses: FacetDropdownObjects = {};

    for (let status in this.args.facets?.status) {
      switch (status) {
        case "Approved":
        case "In-Review":
        case "In Review":
        case "Obsolete":
        case "WIP":
          statuses[status] = this.args.facets?.status[
            status
          ] as FacetDropdownObjectDetails;
          break;
      }
    }

    return statuses;
  }

  /**
   * The facets, depending on the scope.
   * If the facets object is empty, we return the default facets.
   * Otherwise, we return the facets from the object.
   * If the scope is "Docs", we replaces the "status" facet with
   * the statuses from our getter.
   */
  protected get facets() {
    console.log("scope?", this.args.scope);
    switch (this.args.scope) {
      case SearchScope.Projects:
        return [
          {
            name: FacetName.Status,
            values: this.args.facets?.status,
          },
        ];
      default:
        assert("document types must exist", this.documentTypes.index);
        /**
         * Need to use every item in the index to create the docTypeValues
         * The `name` is the key, and the value can be accessed by the same
         * key in this.args.facets?.docType as the value.
         * Object will look like this:
         * { "RFC": { count: 1, isSelected: false }, "PRD": { count: 1, isSelected: false }
         */
        let docTypeValues = {} as FacetDropdownObjects;

        this.documentTypes.index?.forEach((docType) => {
          const key = docType.name;
          let value = this.args.facets?.docType?.[docType.name];

          assert("key must exist", key);

          if (!value) {
            // TODO: decide what to do when the value is 0.
            value = undefined;
          }

          docTypeValues = {
            ...docTypeValues,
            [key]: value,
          } as FacetDropdownObjects;
        });

        let productValues = {} as FacetDropdownObjects;

        console.log("productAreas", this.productAreas.index);

        Object.keys(this.productAreas.index).forEach((product) => {
          let value = this.args.facets?.product?.[product];
          console.log("product", product);
          console.log("value", value);

          if (!value) {
            // TODO: decide what to do when the value is 0.
            value = undefined;
          }

          productValues = {
            ...productValues,
            [product]: value,
          } as FacetDropdownObjects;
        });

        return [
          {
            name: FacetName.DocType,
            values: docTypeValues,
          },
          {
            name: FacetName.Status,
            values: {
              [DocStatusLabel.Approved]:
                this.args.facets?.status?.[DocStatus.Approved],
              [DocStatusLabel.InReview]:
                this.args.facets?.status?.[DocStatus.InReview],
              [DocStatusLabel.Archived]:
                this.args.facets?.status?.[DocStatus.Archived],
            },
          },
          {
            name: FacetName.Product,
            values: productValues,
          },
        ];
    }

    //  if (!this.args.facets || Object.keys(this.args.facets).length === 0) {
    //   switch (this.args.scope) {
    //     case SearchScope.Docs:
    //       return [
    //         {
    //           name: FacetName.DocType,
    //           values: null,
    //         },
    //         {
    //           name: FacetName.Status,
    //           values: null,
    //         },
    //         {
    //           name: FacetName.Product,
    //           values: null,
    //         },
    //         {
    //           name: FacetName.Owners,
    //           values: null,
    //         },
    //       ];
    //     case SearchScope.Projects:
    //       return [
    //         {
    //           name: FacetName.Status,
    //           values: null,
    //         },
    //       ];
    //   }
    // } else {
    //   let facetArray: FacetArrayItem[] = [];

    //   Object.entries(this.args.facets).forEach(([key, value]) => {
    //     if (
    //       key === FacetName.Status &&
    //       this.args.scope !== SearchScope.Projects
    //     ) {
    //       facetArray.push({ name: key, values: this.statuses });
    //     } else {
    //       facetArray.push({ name: key as FacetName, values: value });
    //     }
    //   });

    //   const order = ["docType", "status", "product", "owners"];

    //   facetArray.sort((a, b) => {
    //     return order.indexOf(a.name) - order.indexOf(b.name);
    //   });

    //   return facetArray;
    // }
  }

  /**
   * Closes the dropdown on the next run loop.
   * Done so we don't interfere with Ember's <LinkTo> handling.
   */
  @action protected delayedCloseDropdown(closeDropdown: () => void) {
    next(() => {
      closeDropdown();
    });
  }

  @action protected maybeSubmitForm(dd: XDropdownListAnchorAPI, e: Event) {
    if (e instanceof KeyboardEvent && e.key === "Enter") {
      // this.submitForm();
    }
  }

  protected searchOwners = restartableTask(
    async (dd: XDropdownListAnchorAPI, e: Event) => {},
  );
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::Toolbar": typeof ToolbarComponent;
  }
}
