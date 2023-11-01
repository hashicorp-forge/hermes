import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesDocument } from "hermes/types/document";
import { SortDirection } from "../table/sortable-header";

interface MyDocsComponentSignature {
  Args: {
    docs: HermesDocument[];
  };
}

export default class MyDocsComponent extends Component<MyDocsComponentSignature> {
  @tracked protected sortDirection = SortDirection.Desc;

  @action onSort() {
    if (this.sortDirection === SortDirection.Asc) {
      this.sortDirection = SortDirection.Desc;
    } else {
      this.sortDirection = SortDirection.Asc;
    }
  }

  protected get sortedDocs() {
    if (this.sortDirection === SortDirection.Desc) {
      return this.args.docs;
    } else {
      return this.args.docs.slice().reverse();
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "My::Docs": typeof MyDocsComponent;
  }
}
