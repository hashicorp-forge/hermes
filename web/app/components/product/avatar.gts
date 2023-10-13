import Component from "@glimmer/component";
import getProductID from "hermes/utils/get-product-id";
import or from "ember-truth-helpers/helpers/or";
import { inject as service } from "@ember/service";
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";
import getLetterCount from "hermes/helpers/get-letter-count";
import ProductAreasService from "hermes/services/product-areas";

interface ProductAvatarComponentSignature {
  Element: HTMLDivElement;
  Args: {
    product?: string;
    iconSize?: number;
    fallbackIcon?: string;
  };
  Blocks: {
    default: [];
  };
}

export default class ProductAvatarComponent extends Component<ProductAvatarComponentSignature> {
  @service declare productAreas: ProductAreasService;

  protected get productID(): string | undefined {
    return getProductID(this.args.product);
  }

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

  <template>
    <div
      data-test-product-avatar
      class="product-badge relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md
        {{or this.productID (or this.abbreviation 'no-product')}}"
      ...attributes
    >
      {{#if this.iconIsShown}}
        <FlightIcon
          @name={{or this.productID (or @fallbackIcon "folder")}}
          style={{if this.abbreviation this.sizeStyles}}
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
