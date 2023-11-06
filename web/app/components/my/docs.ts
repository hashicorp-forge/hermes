import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesDocument } from "hermes/types/document";
import { SortDirection } from "../table/sortable-header";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import ConfigService from "hermes/services/config";
import { createDraftURLSearchParams } from "hermes/utils/create-draft-url-search-params";
import AlgoliaService from "hermes/services/algolia";
import { SearchResponse } from "instantsearch.js";

interface MyDocsComponentSignature {
  Args: {
    docs: HermesDocument[];
    sortDirection: SortDirection;
    currentPage: number;
    nbPages: number;
  };
}

export default class MyDocsComponent extends Component<MyDocsComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare algolia: AlgoliaService;
  @service declare authenticatedUser: AuthenticatedUserService;

  @tracked protected page = 1;

  @tracked protected shownDocs = this.args.docs;

  @tracked protected sortDirection = this.args.sortDirection;

  @tracked protected docsModifiedWithin30Days: HermesDocument[] = [];
  @tracked protected docsModifiedMoreThan30DaysAgo: HermesDocument[] = [];

  @tracked protected includeDraftsSharedWithMe = true;

  protected get loadMoreDocsButtonIsShown() {
    console.log(this.page, this.args.nbPages - 1);
    console.log(this.page < this.args.nbPages - 1);
    // are we getting the wrong nbPages?
    return this.page < this.args.nbPages - 1;
  }

  // this is fucked

  protected get docGroups() {
    this.processDocs();

    console.log("docs shown", this.shownDocs.length);

    if (this.sortDirection === SortDirection.Desc) {
      return [
        this.docsModifiedWithin30Days,
        this.docsModifiedMoreThan30DaysAgo,
      ];
    } else {
      // TODO: this is probably wrong
      return [this.args.docs.slice().reverse()];
    }
  }

  protected get toggleOwnerFilterIsShown() {
    if (this.shownDocs.length === 0) {
      return false;
    }

    return this.shownDocs.some((doc) => {
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

  @action protected loadMoreDocs() {
    this._loadMoreDocs.perform();
  }

  protected _loadMoreDocs = task(async () => {
    // need to load the next page of docs
    try {
      this.page++;

      console.log("page plus");

      const draftsPromise = this.fetchSvc
        .fetch(
          `/api/${this.configSvc.config.api_version}/drafts?` +
            createDraftURLSearchParams(
              this.authenticatedUser.info.email,
              this.page,
            ),
        )
        .then((response) => response?.json());

      const indexName = this.configSvc.config.algolia_docs_index_name;
      const searchIndex = `${indexName}_modifiedTime_${this.args.sortDirection}`;

      const docsPromise = this.algolia.getDocResults.perform(
        searchIndex,
        {
          page: this.page,
        },
        true,
      );

      const [draftResults, docResults] = await Promise.all([
        draftsPromise,
        docsPromise,
      ]);

      const typedDocResults = docResults as SearchResponse<HermesDocument>;
      console.log("DOC RESULTS", typedDocResults);
      console.log("DRAFT RESULTS", draftResults);

      this.shownDocs = this.shownDocs.concat(
        typedDocResults.hits as HermesDocument[],
        draftResults?.Hits ?? [],
      );
      this.processDocs();
    } catch (e: unknown) {
      this.page--;
      // TODO: handle error
    }
  });

  @action processDocs() {
    this.docsModifiedWithin30Days = [];
    this.docsModifiedMoreThan30DaysAgo = [];

    return this.shownDocs.filter((doc) => {
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
    //  needs to be a link instead

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
