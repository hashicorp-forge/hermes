import Component from "@glimmer/component";
import getProductID from "hermes/utils/get-product-id";
import or from 'ember-truth-helpers/helpers/or';
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";

interface ProductAvatarComponentSignature {
  Element: HTMLDivElement;
  Args: {
    productArea?: string;
  }
  Blocks: {
    default: [];
  };
}

export default class ProductAvatarComponent extends Component<ProductAvatarComponentSignature> {
  get productID() {
    return getProductID(this.args.productArea);
  }

  <template>
      <div
        data-test-doc-thumbnail-product-badge
        class="product-badge {{this.productID}} relative rounded-full p-[5px]"
      >
        <FlightIcon @name={{or this.productID "folder"}} class="h-[10px] w-[10px]" />
      </div>
      {{this.args.productArea}}
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ProductAvatar: typeof ProductAvatarComponent;
  }
}
