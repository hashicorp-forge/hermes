import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import RecentlyViewedDocsService from "hermes/services/recently-viewed-docs";
import LatestDocsService from "hermes/services/latest-docs";
import ViewportService from "hermes/services/viewport";

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
  @service("latest-docs") declare latestDocs: LatestDocsService;
  @service("recently-viewed-docs")
  declare viewedDocs: RecentlyViewedDocsService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare viewport: ViewportService;

  protected get screenIsSmall(): boolean {
    console.log(this.viewport.width);
    return this.viewport.width < 1024;
  }

  protected get linkToAllDocsIsShown(): boolean {
    return this.latestDocs.nbPages > 1;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Dashboard: typeof DashboardIndexComponent;
  }
}
