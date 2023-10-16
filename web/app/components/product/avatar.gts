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
    size?: "small" | "medium" | "large";
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

  private get sizeIsSmall() {
    return this.args.size === "small" || !this.args.size;
  }

  private get sizeIsMedium() {
    return this.args.size === "medium";
  }

  private get sizeIsLarge() {
    return this.args.size === "large";
  }

  protected get style() {
    if (!this.productID && this.color) {
      return `background: ${this.color};`;
    }
  }

  protected get color() {
    return this.productAreas.getColor(this.args.product);
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
      style={{this.style}}
      class="product-badge relative flex shrink-0 shrink-0 items-center justify-center rounded-md
        {{or this.productID (or this.abbreviation 'no-product')}}
        {{if
          this.sizeIsLarge
          'h-8 w-8'
          (if this.sizeIsMedium 'h-7 w-7' 'h-5 w-5')
        }}
        "
      ...attributes
    >
      {{#if this.iconIsShown}}
        <FlightIcon
          @name={{or this.productID (or @fallbackIcon "folder")}}
          class={{if this.sizeIsSmall "h-3 w-3" "h-4 w-4"}}
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
