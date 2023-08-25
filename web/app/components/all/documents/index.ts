import Component from "@glimmer/component";
import { SortByValue } from "hermes/components/header/toolbar";
import { SortDirection } from "hermes/components/table/sortable-header";
import { HermesDocument } from "hermes/types/document";
import { FacetRecords } from "hermes/types/facets";
import { SearchResponse } from "instantsearch.js";

interface AllDocumentsComponentSignature {
  Args: {
    facets?: FacetRecords;
    results: SearchResponse<HermesDocument>;
    sortedBy: SortByValue;
  };
}

export default class AllDocumentsComponent extends Component<AllDocumentsComponentSignature> {
  protected get sortDirection() {
    switch (this.args.sortedBy) {
      case SortByValue.DateAsc:
        return SortDirection.Asc;
      default:
        return SortDirection.Desc;
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "All::Documents": typeof AllDocumentsComponent;
  }
}
