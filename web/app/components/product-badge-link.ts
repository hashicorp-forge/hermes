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
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ProductBadgeLink: typeof ProductBadgeLinkComponent;
  }
}
