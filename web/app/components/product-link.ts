import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import getProductLabel from "hermes/utils/get-product-label";

interface ProductLinkComponentSignature {
  Element: HTMLAnchorElement;
  Args: {
    product?: string;
  };
  Blocks: {
    default: [];
  };
}

export default class ProductLinkComponent extends Component<ProductLinkComponentSignature> {
  @service declare router: RouterService;

  protected get productAreaName(): string | undefined {
    return getProductLabel(this.args.product);
  }

  protected get query() {
    if (this.args.product) {
      return {
        product: [this.args.product],
        docType: [],
        owners: [],
        page: 1,
        sortBy: "dateDesc",
        status: [],
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
        return "authenticated.documents";
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ProductLink: typeof ProductLinkComponent;
  }
}
