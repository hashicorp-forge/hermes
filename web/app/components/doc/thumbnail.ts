import Component from "@glimmer/component";
import { dasherize } from "@ember/string";
import getProductId from "hermes/utils/get-product-id";
import { inject as service } from "@ember/service";
import ProductAreasService from "hermes/services/product-areas";
import { HermesSize } from "hermes/types/sizes";

export type DocThumbnailSize = Exclude<HermesSize, HermesSize.XL>;

interface DocThumbnailComponentSignature {
  Element: HTMLDivElement;
  Args: {
    status?: string;
    product?: string;
    badgeIsHidden?: boolean;
    size?: `${DocThumbnailSize}`;
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

  protected get size() {
    return this.args.size ?? HermesSize.Small;
  }

  protected get productShortName(): string | undefined {
    return getProductId(this.args.product);
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

    // if (this.productAreas.getAbbreviation(this.args.product)) {
    //   return true;
    // }

    return false;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Thumbnail": typeof DocThumbnailComponent;
  }
}
