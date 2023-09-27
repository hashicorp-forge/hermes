import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { LinkTo } from "@ember/routing";
import ProductAvatar from "hermes/components/product-avatar";

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

  <template>
    <LinkTo
      @route={{this.route}}
      @query={{this.query}}
      class="product-badge-link"
      ...attributes
    >
      <ProductAvatar @productArea={{@productArea}} />
      {{this.productAreaName}}
    </LinkTo>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ProductBadgeLink: typeof ProductBadgeLinkComponent;
  }
}
