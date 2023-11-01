import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { SortAttribute, SortDirection } from "./table/sortable-header";

interface RowResultsComponentSignature {
  Args: {
    docs: HermesDocument[];
    isDraft?: boolean;
    nbPages?: number;
    currentPage?: number;
    changeSort?: (attribute: SortAttribute) => void;
    currentSort: `${SortAttribute}`;
    sortDirection: SortDirection;
  };
}
export default class RowResultsComponent extends Component<RowResultsComponentSignature> {
  protected get paginationIsShown() {
    return this.args.nbPages && this.args.currentPage !== undefined;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    RowResults: typeof RowResultsComponent;
  }
}
