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
    sortDirection: SortDirection;
  };
}

export default class MyDocsComponent extends Component<MyDocsComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;

  @tracked protected sortDirection = this.args.sortDirection;

  @tracked protected docsModifiedWithin30Days: HermesDocument[] = [];
  @tracked protected docsModifiedMoreThan30DaysAgo: HermesDocument[] = [];

  @tracked protected includeDraftsSharedWithMe = true;

  // this is fucked

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

  protected get toggleOwnerFilterIsShown() {
    if (this.args.docs.length === 0) {
      return false;
    }

    return this.args.docs.some((doc) => {
      return doc.owners?.[0] !== this.authenticatedUser.info.email;
    });
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
    // TODO: this needs to update queryparams

    this.includeDraftsSharedWithMe = !this.includeDraftsSharedWithMe;
  }

  @action protected onSort() {
    // TODO: this needs to update queryparams

    if (this.sortDirection === SortDirection.Asc) {
      this.sortDirection = SortDirection.Desc;
    } else {
      this.sortDirection = SortDirection.Asc;
    }

    window.scrollTo(0, 0);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "My::Docs": typeof MyDocsComponent;
  }
}
