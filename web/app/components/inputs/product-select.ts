import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { service } from "@ember/service";
import { OffsetOptions, Placement } from "@floating-ui/dom";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import FetchService from "hermes/services/fetch";
import ProductAreasService, {
  ProductArea,
} from "hermes/services/product-areas";
import getProductId from "hermes/utils/get-product-id";
import { MatchAnchorWidthOptions } from "../floating-u-i/content";

interface InputsProductSelectSignature {
  Element: HTMLDivElement;
  Args: {
    selected?: string;
    onChange: (value: string, attributes: ProductArea) => void;
    placement?: Placement;
    selectedAbbreviationIsHidden?: boolean;
    isSaving?: boolean;
    renderOut?: boolean;
    offset?: OffsetOptions;
    matchAnchorWidth?: MatchAnchorWidthOptions;
    color?: "quarternary";
  };
}

export default class InputsProductSelectComponent extends Component<InputsProductSelectSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare productAreas: ProductAreasService;

  @tracked selected = this.args.selected;

  get products() {
    return this.productAreas.index;
  }

  get icon(): string {
    let icon = "folder";
    if (this.selected && getProductId(this.selected)) {
      icon = getProductId(this.selected) as string;
    }
    return icon;
  }

  get selectedProductAbbreviation(): string | undefined {
    if (this.args.selectedAbbreviationIsHidden) return;
    return this.productAreas.getAbbreviation(this.selected);
  }

  @action onChange(newValue: any, attributes: ProductArea) {
    this.selected = newValue;
    this.args.onChange(newValue, attributes);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::ProductSelect": typeof InputsProductSelectComponent;
  }
}
