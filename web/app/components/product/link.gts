import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { LinkTo } from "@ember/routing";
import Product from "hermes/components/product";

interface ProductLinkComponentSignature {
  Element: HTMLAnchorElement;
  Args: {
    product?: string;
    avatarIsHidden?: boolean;
  };
  Blocks: {
    default: [];
  };
}

export default class ProductLinkComponent extends Component<ProductLinkComponentSignature> {
  @service declare router: RouterService;

  protected get productAreaName(): string {
    switch (this.args.product) {
      case "Cloud Platform":
        return "HCP";
      default:
        return this.args.product || "Unknown";
    }
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

  <template>
    <LinkTo
      data-test-product-link
      @route={{this.route}}
      @query={{this.query}}
      class="product-link"
      ...attributes
    >
      <Product
        @name={{this.args.product}}
        @avatarIsHidden={{@avatarIsHidden}}
      />
    </LinkTo>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Product::Link": typeof ProductLinkComponent;
  }
}
