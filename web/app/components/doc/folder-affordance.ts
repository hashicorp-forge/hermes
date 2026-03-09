import Component from "@glimmer/component";
import type { DocThumbnailSize } from "hermes/components/doc/thumbnail";
import { HermesSize } from "hermes/types/sizes";

interface DocFolderAffordanceSignature {
  Args: {
    size?: `${DocThumbnailSize}`;
  };
}

export default class DocFolderAffordance extends Component<DocFolderAffordanceSignature> {
  protected get sizeIsSmall(): boolean {
    return this.args.size === HermesSize.Small || !this.args.size;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::FolderAffordance": typeof DocFolderAffordance;
  }
}
