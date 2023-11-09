import Component from "@glimmer/component";
import getProductID from "hermes/utils/get-product-id";
import { inject as service } from "@ember/service";
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";
import ProductAreasService from "hermes/services/product-areas";
import { assert } from "@ember/debug";
import { HermesSize } from "hermes/types/sizes";

interface ProductAvatarComponentSignature {
  Element: HTMLDivElement;
  Args: {
    product?: string;
    size?: `${Exclude<HermesSize, HermesSize.XL>}`;
  };
  Blocks: {
    default: [];
  };
}

export default class ProductAvatarComponent extends Component<ProductAvatarComponentSignature> {
  @service declare productAreas: ProductAreasService;

  private get productID(): string {
    const productID = getProductID(this.args.product);
    assert("productID must edxist", productID);
    return productID;
  }

  private get size() {
    return this.args.size ?? HermesSize.Small;
  }

  <template>
    <div
      data-test-product-avatar
      class="product-badge avatar rounded-md {{this.productID}} {{this.size}}"
      ...attributes
    >
      <FlightIcon @name={{this.productID}} class="h-4 w-4" />
    </div>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Product::Avatar": typeof ProductAvatarComponent;
  }
}
