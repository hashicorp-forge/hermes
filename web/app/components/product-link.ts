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
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ProductLink: typeof ProductLinkComponent;
  }
}
