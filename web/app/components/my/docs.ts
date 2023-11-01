import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesDocument } from "hermes/types/document";
import { SortDirection } from "../table/sortable-header";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";

interface MyDocsComponentSignature {
  Args: {
    docs: HermesDocument[];
  };
}

export default class MyDocsComponent extends Component<MyDocsComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;

  @tracked protected sortDirection = SortDirection.Desc;

  @tracked protected docsModifiedWithin30Days: HermesDocument[] = [];
  @tracked protected docsModifiedMoreThan30DaysAgo: HermesDocument[] = [];

  @tracked protected includeDraftsSharedWithMe = true;

  protected get docGroups() {
    this.processDocs();

    if (this.sortDirection === SortDirection.Desc) {
      return [
        this.docsModifiedWithin30Days,
        this.docsModifiedMoreThan30DaysAgo,
      ];
    } else {
      return [this.args.docs.slice().reverse()];
    }
  }

  protected get filteredDocGroups() {
    if (!this.includeDraftsSharedWithMe) {
      return this.docGroups.filter((docs) => {
        return docs.every((doc) => {
          return doc.owners?.[0] === this.authenticatedUser.info.email;
        });
      });
    }
  }

  @action processDocs() {
    this.docsModifiedWithin30Days = [];
    this.docsModifiedMoreThan30DaysAgo = [];

    return this.args.docs.slice().filter((doc) => {
      if (!doc.modifiedTime) {
        this.docsModifiedMoreThan30DaysAgo.push(doc);
      } else {
        const modifiedTime = new Date(doc.modifiedTime * 1000).getTime();
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        if (modifiedTime > thirtyDaysAgo) {
          this.docsModifiedWithin30Days.push(doc);
        } else {
          this.docsModifiedMoreThan30DaysAgo.push(doc);
        }
      }
    });
  }

  @action protected toggleOwnerFilter() {
    this.includeDraftsSharedWithMe = !this.includeDraftsSharedWithMe;
  }

  @action protected onSort() {
    if (this.sortDirection === SortDirection.Asc) {
      this.sortDirection = SortDirection.Desc;
    } else {
      this.sortDirection = SortDirection.Asc;
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "My::Docs": typeof MyDocsComponent;
  }
}
