import Component from "@glimmer/component";
import getProductID from "hermes/utils/get-product-id";
import getLetterCount from "hermes/helpers/get-letter-count";
import or from "ember-truth-helpers/helpers/or";
import { inject as service } from "@ember/service";
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";
import ProductAreasService from "hermes/services/product-areas";
import { assert } from "@ember/debug";
import { HermesBasicAvatarSize } from "hermes/types/avatar-size";

interface ProductAvatarComponentSignature {
  Element: HTMLDivElement;
  Args: {
    product?: string;
    iconSize?: number;
    fallbackIcon?: string;
    size?: `${HermesBasicAvatarSize}`;
  };
  Blocks: {
    default: [];
  };
}

export default class ProductAvatarComponent extends Component<ProductAvatarComponentSignature> {
  @service declare productAreas: ProductAreasService;

  protected get sizeStyles() {
    const iconSize = this.args.iconSize || 12;
    return `height: ${iconSize}px; width: ${iconSize}px;`;
  }

  protected get abbreviation() {
    return this.productAreas.getAbbreviation(this.args.product);
  }

  protected get iconIsShown() {
    if (this.productID) {
      return true;
    }

    if (this.abbreviation) {
      return false;
    }

    return true;
  }
  private get productID(): string {
    const productID = getProductID(this.args.product);
    assert("productID must edxist", productID);
    return productID;
  }

  private get size() {
    return this.args.size ?? HermesBasicAvatarSize.Small;
  }

  <template>
    <div
      data-test-product-avatar
      class="product-badge avatar rounded-md
        {{or this.productID (or this.abbreviation 'no-product')}}"
      ...attributes
    >
      {{#if this.iconIsShown}}
        <FlightIcon
          @name={{or this.productID (or @fallbackIcon "folder")}}
          style={{unless this.abbreviation this.sizeStyles}}
        />
      {{else if this.abbreviation}}
        <span
          class="product-abbreviation letter-count-{{getLetterCount
              this.abbreviation
            }}"
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
