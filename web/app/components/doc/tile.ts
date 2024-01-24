import Component from "@glimmer/component";

interface DocTileComponentSignature {
  Element: HTMLDivElement;
  Args: {
    docID?: string;
    docNumber?: string;
    isResult?: boolean;
    isDraft?: boolean;
    modifiedTime?: number;
    owner?: string;
    productArea?: string;
    snippet?: string;
    status?: string;
    title?: string;
  };
}

export default class DocTileComponent extends Component<DocTileComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Tile": typeof DocTileComponent;
  }
}
