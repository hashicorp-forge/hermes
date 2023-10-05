import Component from "@glimmer/component";
import getProductID from "hermes/utils/get-product-id";
import or from "ember-truth-helpers/helpers/or";
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";
import getLetterCount from "hermes/helpers/get-letter-count";
import getProductAbbreviation from "hermes/helpers/get-product-abbreviation";

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
      {{#if this.productID}}
        <FlightIcon
          @name={{or this.productID "folder"}}
          style={{this.sizeStyles}}
        />
      {{else}}
        <span
          class="letter-avatar font-medium letter-count-{{getLetterCount
              (getProductAbbreviation @productArea)
            }}
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          {{getProductAbbreviation @productArea}}
        </span>
      {{/if}}
    </div>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ProductAvatar: typeof ProductAvatarComponent;
  }
}
