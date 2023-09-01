import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { SortAttribute, SortDirection } from "./table/sortable-header";
import { assert } from "@ember/debug";

interface RowResultsComponentSignature {
  Args: {
    docs: HermesDocument[];
    nbPages?: number;
    currentPage?: number;
    changeSort?: (attribute: SortAttribute) => void;
    currentSort: `${SortAttribute}`;
    sortDirection: `${SortDirection}`;
  };
}

export default class RowResultsComponent extends Component<RowResultsComponentSignature> {
  protected get paginationIsShown() {
    return this.args.nbPages && this.args.currentPage !== undefined;
  }

  protected get nbPages() {
    assert("nbPages must exist", this.args.nbPages);
    return this.args.nbPages;
  }

  protected get currentPage() {
    assert("currentPage must exist", this.args.currentPage);
    return this.args.currentPage;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    RowResults: typeof RowResultsComponent;
  }
}
