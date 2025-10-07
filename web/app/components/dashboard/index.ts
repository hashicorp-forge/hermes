import Component from "@glimmer/component";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { HermesDocument } from "hermes/types/document";
import { service } from "@ember/service";

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
  @service declare authenticatedUser: AuthenticatedUserService;

  protected get firstName(): string {
    // Note: When using Dex authentication without OIDC flow, user info may not be loaded
    return this.authenticatedUser.info?.firstName ?? "Guest";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Dashboard: typeof DashboardIndexComponent;
  }
}
