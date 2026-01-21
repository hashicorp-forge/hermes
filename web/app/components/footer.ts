import Component from "@glimmer/component";
import { service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import { HERMES_GITHUB_REPO_URL } from "hermes/utils/hermes-urls";
import ConfigService from "hermes/services/config";

interface FooterComponentSignature {
  Element: HTMLDivElement;
}

export default class FooterComponent extends Component<FooterComponentSignature> {
  @service declare router: RouterService;
  @service declare config: ConfigService;

  protected get version() {
    return this.config.config.version;
  }

  protected get revision() {
    return this.config.config.short_revision;
  }

  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  protected get currentYear(): number {
    return new Date().getFullYear();
  }

  protected get gitHubRepoURL() {
    return HERMES_GITHUB_REPO_URL;
  }

  protected get supportURL() {
    return this.config.config.support_link_url;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Footer: typeof FooterComponent;
  }
}
