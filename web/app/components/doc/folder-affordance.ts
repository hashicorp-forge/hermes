import Component from "@glimmer/component";

interface DocFolderAffordanceSignature {
  Args: {
    isLarge?: boolean;
  };
}

export default class DocFolderAffordance extends Component<DocFolderAffordanceSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::FolderAffordance": typeof DocFolderAffordance;
  }
}
