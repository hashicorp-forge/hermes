import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import RecentlyViewedDocsService from "hermes/services/recently-viewed-docs";

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
  declare recentDocs: RecentlyViewedDocsService;
  @service declare authenticatedUser: AuthenticatedUserService;
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Dashboard: typeof DashboardIndexComponent;
  }
}
