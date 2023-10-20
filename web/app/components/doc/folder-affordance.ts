import Component from "@glimmer/component";

interface DocFolderAffordanceSignature {
  Args: {
    size?: "large";
  };
}

export default class DocFolderAffordance extends Component<DocFolderAffordanceSignature> {
  protected get sizeIsLarge(): boolean {
    return this.args.size === "large";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::FolderAffordance": typeof DocFolderAffordance;
  }
}
