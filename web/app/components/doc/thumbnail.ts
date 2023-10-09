import Component from "@glimmer/component";
import { dasherize } from "@ember/string";

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
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Thumbnail": typeof DocThumbnailComponent;
  }
}
