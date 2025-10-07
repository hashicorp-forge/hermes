import Component from "@glimmer/component";
import { dasherize } from "@ember/string";
import getProductId from "hermes/utils/get-product-id";
import { HermesSize } from "hermes/types/sizes";
import { service } from "@ember/service";
import ProductAreasService from "hermes/services/product-areas";

export type DocThumbnailSize = Exclude<HermesSize, HermesSize.XL>;

interface DocThumbnailComponentSignature {
  Element: HTMLDivElement;
  Args: {
    status?: string;
    product?: string;
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

  protected get badgeIsShown(): boolean {
    if (getProductId(this.args.product)) {
      return true;
    }

    if (this.productAreas.getAbbreviation(this.args.product)) {
      return true;
    }

    return false;
  }

  protected get isApproved(): boolean {
    return this.status === "approved";
  }

  protected get isObsolete(): boolean {
    return this.status === "obsolete";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Thumbnail": typeof DocThumbnailComponent;
  }
}
