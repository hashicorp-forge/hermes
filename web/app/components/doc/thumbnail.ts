import Component from "@glimmer/component";
import { dasherize } from "@ember/string";
import getProductId from "hermes/utils/get-product-id";
import getProductAbbreviation from "hermes/utils/get-product-abbreviation";
import { inject as service } from "@ember/service";
import ProductAreasService from "hermes/services/product-areas";

interface DocThumbnailComponentSignature {
  Element: HTMLDivElement;
  Args: {
    isLarge?: boolean;
    status?: string;
    product?: string;
    badgeIsHidden?: boolean;
  };
}

export default class DocThumbnailComponent extends Component<DocThumbnailComponentSignature> {
  @service declare productAreas: ProductAreasService;

  protected get status(): string | null {
    if (this.args.status) {
      return dasherize(this.args.status);
    } else {
      return null;
    }
  }

  protected get isApproved(): boolean {
    return this.status === "approved";
  }

  protected get isObsolete(): boolean {
    return this.status === "obsolete";
  }

  protected get badgeIsShown(): boolean {
    if (this.args.badgeIsHidden) {
      return false;
    }

    if (getProductId(this.args.product)) {
      return true;
    }

    if (getProductAbbreviation(this.productAreas.index, this.args.product)) {
      return true;
    }

    return false;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Thumbnail": typeof DocThumbnailComponent;
  }
}
