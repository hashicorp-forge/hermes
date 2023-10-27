import Component from "@glimmer/component";
import getProductID from "hermes/utils/get-product-id";
import { inject as service } from "@ember/service";
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";
import ProductAreasService from "hermes/services/product-areas";
import { assert } from "@ember/debug";
import { HermesAvatarSize } from "hermes/types/avatar-size";

interface ProductAvatarComponentSignature {
  Element: HTMLDivElement;
  Args: {
    product: string;
    size?: `${HermesAvatarSize}`;
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

  private get sizeIsMedium() {
    return this.args.size === HermesAvatarSize.Medium;
  }

  private get sizeIsLarge() {
    return this.args.size === HermesAvatarSize.Large;
  }

  <template>
    <div
      data-test-product-avatar
      class="product-badge relative flex shrink-0 shrink-0 items-center justify-center rounded-md
        {{this.productID}}
        {{if
          this.sizeIsLarge
          'h-8 w-8'
          (if this.sizeIsMedium 'h-7 w-7' 'h-5 w-5')
        }}
        "
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
