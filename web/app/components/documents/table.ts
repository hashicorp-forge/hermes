import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import {
  SortAttribute,
  SortDirection,
} from "hermes/components/table/sortable-header";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import Store from "@ember-data/store";
import { task, timeout } from "ember-concurrency";

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
  @service declare store: Store;

  protected get paginationIsShown() {
    return this.args.nbPages && this.args.currentPage !== undefined;
  }

  @action loadPeople() {
    this.loadPeopleTask.perform();
  }

  loadPeopleTask = task(async () => {
    const documentOwners = this.args.docs
      .map((doc) => doc.owners)
      .flat()
      .uniq()
      .join(",");

    await this.store
      .queryRecord("person", { emails: documentOwners })
      .then((people) => {
        console.log("people", people);
      });

    console.log("fess", this.store.peekAll("person"));
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Documents::Table": typeof DocumentsTableComponent;
  }
}
