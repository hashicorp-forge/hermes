import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import { HERMES_GITHUB_REPO_URL } from "hermes/utils/hermes-urls";

interface FooterComponentSignature {
  Element: HTMLDivElement;
}

export default class FooterComponent extends Component<FooterComponentSignature> {
  @service declare router: RouterService;

  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  protected get currentYear(): number {
    return new Date().getFullYear();
  }

  protected get hermesVersion() {
    // TODO: Get this from the config
    return "0.3.0";
  }

  protected get gitHubRepoURL() {
    return HERMES_GITHUB_REPO_URL;
  }

  protected get supportDocsURL() {
    // TODO: Get this from the config
    return "";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Footer: typeof FooterComponent;
  }
}
