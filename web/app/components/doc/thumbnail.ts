import Component from "@glimmer/component";
import { dasherize } from "@ember/string";
import getProductId from "hermes/utils/get-product-id";

export enum DocThumbnailSize {
  Small = "small",
  Large = "large",
}

interface DocThumbnailComponentSignature {
  Element: HTMLDivElement;
  Args: {
    status?: string;
    product?: string;
    size?: "large";
  };
}

export default class DocThumbnailComponent extends Component<DocThumbnailComponentSignature> {
  protected get status(): string | null {
    if (this.args.status) {
      return dasherize(this.args.status);
    } else {
      return null;
    }
  }

  protected get productAvatarSize() {
    if (this.sizeIsLarge) {
      return DocThumbnailSize.Large;
    } else {
      return DocThumbnailSize.Small;
    }
  }

  protected get sizeIsLarge(): boolean {
    return this.args.size === "large";
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
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Thumbnail": typeof DocThumbnailComponent;
  }
}
