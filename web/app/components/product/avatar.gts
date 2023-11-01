import Component from "@glimmer/component";
import getProductID from "hermes/utils/get-product-id";
import { inject as service } from "@ember/service";
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";
import ProductAreasService from "hermes/services/product-areas";
import { assert } from "@ember/debug";
import { HermesBasicAvatarSize } from "hermes/types/avatar-size";

interface ProductAvatarComponentSignature {
  Element: HTMLDivElement;
  Args: {
    product?: string;
    size?: `${HermesBasicAvatarSize}`;
    icon?: string;
  };
  Blocks: {
    default: [];
  };
}

export default class ProductAvatarComponent extends Component<ProductAvatarComponentSignature> {
  @service declare productAreas: ProductAreasService;

  private get productID(): string {
    const productID = getProductID(this.args.product);
    assert("productID must exist", productID);
    return productID;
  }

  private get size() {
    return this.args.size ?? HermesBasicAvatarSize.Small;
  }

  private get id() {
    return this.args.icon ?? this.productID;
  }

  <template>
    <div
      data-test-product-avatar
      class="product-badge avatar rounded-md {{this.id}} {{this.size}}"
      ...attributes
    >
      <FlightIcon @name={{this.id}} />
    </div>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Product::Avatar": typeof ProductAvatarComponent;
  }
}
