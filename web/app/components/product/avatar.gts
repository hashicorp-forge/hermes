import Component from "@glimmer/component";
import getProductID from "hermes/utils/get-product-id";
import { inject as service } from "@ember/service";
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";
import ProductAreasService from "hermes/services/product-areas";
import { assert } from "@ember/debug";
import { HermesSize } from "hermes/types/sizes";
import fontColorContrast from "font-color-contrast";

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

  private get productID(): string | undefined {
    return getProductID(this.args.product);
  }

  private get size() {
    return this.args.size ?? HermesSize.Small;
  }

  private get colorStyles() {
    if (this.productID) return;

    const bgColor = this.productAreas.getProductColor(this.args.product);

    assert("bgColor must exist", bgColor);

    const textColor = fontColorContrast(bgColor);

    return `background-color: ${bgColor}; color: ${textColor};`;
  }

  <template>
    <div
      data-test-product-avatar
      style={{this.colorStyles}}
      class="product-badge avatar rounded-md {{this.productID}} {{this.size}}"
      ...attributes
    >
      {{#if this.productID}}
        <FlightIcon @name={{this.productID}} class="h-4 w-4" />
      {{else}}
        H
      {{/if}}
    </div>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Product::Avatar": typeof ProductAvatarComponent;
  }
}
