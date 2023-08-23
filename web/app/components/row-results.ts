import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { SortAttribute, SortDirection } from "./my-docs";
import { assert } from "@ember/debug";
import { action } from "@ember/object";

interface RowResultsComponentSignature {
  Args: {
    docs: HermesDocument[];
    nbPages?: number;
    currentPage?: number;
    changeSort?: (attribute: SortAttribute) => void;
    toggleCollapsed?: () => void;
    sortAttribute: `${SortAttribute}`;
    sortDirection: SortDirection;
    isCollapsed?: boolean;
  };
}

export default class RowResultsComponent extends Component<RowResultsComponentSignature> {
  protected get paginationIsShown() {
    return this.args.nbPages && this.args.currentPage !== undefined;
  }

  protected get toggleCollapsedButtonIsShown() {
    return (
      this.args.docs.length > 12 &&
      !this.paginationIsShown &&
      this.args.toggleCollapsed
    );
  }
  @action protected toggleCollapsed() {
    assert("this.args.toggleCollapsed must exist", this.args.toggleCollapsed);
    this.args.toggleCollapsed();
  }

  get shownDocs() {
    if (this.args.isCollapsed) {
      return this.args.docs.slice(0, 12);
    } else {
      return this.args.docs;
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    RowResults: typeof RowResultsComponent;
  }
}
