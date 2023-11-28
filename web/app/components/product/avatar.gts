import Component from "@glimmer/component";
import getProductID from "hermes/utils/get-product-id";
import or from "ember-truth-helpers/helpers/or";
import { inject as service } from "@ember/service";
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";
import ProductAreasService from "hermes/services/product-areas";
import { assert } from "@ember/debug";
import { HermesSize } from "hermes/types/sizes";
import fontColorContrast from "font-color-contrast";
import FlagsService from "hermes/services/flags";

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
  @service declare flags: FlagsService;

  private get productID(): string | undefined {
    return getProductID(this.args.product);
  }

  private get size() {
    return this.args.size ?? HermesSize.Small;
  }

  private get sizeIsSmall() {
    return this.size === HermesSize.Small;
  }

  private get colorStyles() {
    if (!this.flags.productColors) return;
    if (this.productID) return;

    const bgColor = this.productAreas.getProductColor(this.args.product);

    assert("bgColor must exist", bgColor);

    const textColor = fontColorContrast(bgColor);

    return `background-color: ${bgColor}; color: ${textColor};`;
  }

  private get abbreviation() {
    const abbreviation = this.productAreas.getAbbreviation(this.args.product);

    if (!abbreviation) return;

    if (abbreviation.length > 3) {
      return abbreviation.slice(0, 1);
    }

    return abbreviation;
  }

  private get letterCount() {
    return this.abbreviation?.length ?? 0;
  }

  private get iconIsShown() {
    if (this.productID) return true;
    if (!this.flags.productColors) return true;
    if (this.abbreviation) return false;
    return true;
  }

  <template>
    <div
      data-test-product-avatar
      style={{this.colorStyles}}
      class="product-badge avatar rounded-md {{this.productID}} {{this.size}}"
      ...attributes
    >
      {{#if this.iconIsShown}}
        <FlightIcon
          @name={{or this.productID "folder"}}
          class={{if this.sizeIsSmall "h3 w-3" "h-4 w-4"}}
        />
      {{else if this.abbreviation}}
        <span
          data-test-product-abbreviation
          class="product-abbreviation letter-count-{{this.letterCount}}"
        >
          {{this.abbreviation}}
        </span>
      {{/if}}
    </div>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Product::Avatar": typeof ProductAvatarComponent;
  }
}
