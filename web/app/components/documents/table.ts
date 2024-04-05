import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import {
  SortAttribute,
  SortDirection,
} from "hermes/components/table/sortable-header";

interface DocumentsTableComponentSignature {
  Args: {
    docs: HermesDocument[];
    isDraft?: boolean;
    nbPages?: number;
    currentPage?: number;
    currentSort: `${SortAttribute}`;
    sortDirection: SortDirection;
  };
}
export default class DocumentsTableComponent extends Component<DocumentsTableComponentSignature> {
  protected get paginationIsShown() {
    return this.args.nbPages && this.args.currentPage !== undefined;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Documents::Table": typeof DocumentsTableComponent;
  }
}
