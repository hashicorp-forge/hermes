import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";

interface ProductBadgeLinkComponentSignature {
  Element: HTMLAnchorElement;
  Args: {
    productArea?: string;
  };
  Blocks: {
    default: [];
  };
}

export default class ProductBadgeLinkComponent extends Component<ProductBadgeLinkComponentSignature> {
  @service declare router: RouterService;

  protected get productAreaName(): string {
    switch (this.args.productArea) {
      case "Cloud Platform":
        return "HCP";
      default:
        return this.args.productArea || "Unknown";
    }
  }

  protected get query() {
    if (this.args.productArea) {
      return {
        product: [this.args.productArea],
      };
    } else {
      return {};
    }
  }

  /**
   * The route the badge should link to.
   * If on the /drafts or /my screen, stay there.
   * In all other cases, link to the /all screen.
   */
  protected get route() {
    const { currentRouteName } = this.router;

    switch (currentRouteName) {
      case "authenticated.drafts":
      case "authenticated.my":
        return currentRouteName;
      default:
        return "authenticated.all";
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ProductBadgeLink: typeof ProductBadgeLinkComponent;
  }
}
