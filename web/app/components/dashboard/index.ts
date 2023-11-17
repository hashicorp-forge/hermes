import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import RecentlyViewedDocsService from "hermes/services/recently-viewed-docs";
import { task } from "ember-concurrency";
import AlgoliaService from "hermes/services/algolia";
import { tracked } from "@glimmer/tracking";
import ConfigService from "hermes/services/config";
import { assert } from "@ember/debug";

interface DashboardIndexComponentSignature {
  Element: null;
  Args: {
    docsAwaitingReview?: HermesDocument[];
  };
  Blocks: {
    default: [];
  };
}

export default class DashboardIndexComponent extends Component<DashboardIndexComponentSignature> {
  @service("recently-viewed-docs")
  declare recentlyViewedDocs: RecentlyViewedDocsService;
  @service("config") declare configSvc: ConfigService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare algolia: AlgoliaService;

  @tracked latestDocs: HermesDocument[] | null = null;
  @tracked linkToAllDocsIsShown = false;

  // TODO: consider if this is now worth including in the model

  protected fetchLatestDocs = task(async () => {
    // TODO: explain why this is necessary
    await this.algolia.clearCache.perform();

    // TODO: confirm if we need searchIndex and not search
    const response = await this.algolia.searchIndex
      .perform(
        this.configSvc.config.algolia_docs_index_name + "_modifiedTime_desc",
        "",
        {
          hitsPerPage: 12,
        },
      )
      .then((response) => response);

    assert("response must exist", response);

    this.linkToAllDocsIsShown = response.nbPages > 1;
    this.latestDocs = response.hits as HermesDocument[];
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Dashboard: typeof DashboardIndexComponent;
  }
}
