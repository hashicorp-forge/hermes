import Component from "@glimmer/component";
import getProductID from "hermes/utils/get-product-id";
import or from "ember-truth-helpers/helpers/or";
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";

interface ProductAvatarComponentSignature {
  Element: HTMLDivElement;
  Args: {
    productArea?: string;
    iconSize?: number;
  };
  Blocks: {
    default: [];
  };
}

export default class ProductAvatarComponent extends Component<ProductAvatarComponentSignature> {
  get productID() {
    return getProductID(this.args.productArea);
  }

  get sizeStyles() {
    const iconSize = this.args.iconSize || 12;
    return `height: ${iconSize}px; width: ${iconSize}px;`;
  }

  <template>
    <div
      data-test-doc-thumbnail-product-badge
      class="product-badge {{this.productID}} relative rounded-full p-1"
      ...attributes
    >
      <FlightIcon
        @name={{or this.productID "folder"}}
        style={{this.sizeStyles}}
      />
    </div>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ProductAvatar: typeof ProductAvatarComponent;
  }
}
