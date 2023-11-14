import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import {
  SortAttribute,
  SortDirection,
} from "hermes/components/table/sortable-header";

interface AllTableComponentSignature {
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
export default class AllTableComponent extends Component<AllTableComponentSignature> {
  protected get paginationIsShown() {
    return this.args.nbPages && this.args.currentPage !== undefined;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "All::Table": typeof AllTableComponent;
  }
}
