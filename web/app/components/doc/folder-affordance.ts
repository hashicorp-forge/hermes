import Component from "@glimmer/component";
import { DocThumbnailSize } from "hermes/components/doc/thumbnail";

interface DocFolderAffordanceSignature {
  Args: {
    size?: `${DocThumbnailSize}`;
  };
}

export default class DocFolderAffordance extends Component<DocFolderAffordanceSignature> {
  protected get sizeIsSmall(): boolean {
    return this.args.size === "small" || !this.args.size;
  }

  protected get sizeIsMedium(): boolean {
    return this.args.size === "medium";
  }

  protected get sizeIsLarge(): boolean {
    return this.args.size === "large";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::FolderAffordance": typeof DocFolderAffordance;
  }
}
