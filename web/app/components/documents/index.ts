import Component from "@glimmer/component";
import { SortByValue } from "hermes/components/header/toolbar";
import { SortDirection } from "hermes/components/table/sortable-header";
import { HermesDocument } from "hermes/types/document";
import { FacetRecords } from "hermes/types/facets";
import { SearchResponse } from "instantsearch.js";

interface DocumentsComponentSignature {
  Args: {
    facets?: FacetRecords;
    results: SearchResponse<HermesDocument>;
    sortedBy: SortByValue;
  };
}

export default class DocumentsComponent extends Component<DocumentsComponentSignature> {
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
    Documents: typeof DocumentsComponent;
  }
}
