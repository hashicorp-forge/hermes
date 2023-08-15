import Component from "@glimmer/component";

interface DocTileComponentSignature {
  Args: {
    avatar?: string;
    docID?: string;
    docNumber?: string;
    isOwner?: boolean;
    isResult?: boolean;
    isDraft?: boolean;
    modifiedAgo?: string;
    owner?: string;
    productArea?: string;
    snippet?: string;
    status?: string;
    thumbnail?: string;
    title?: string;
  };
}

export default class DocTileComponent extends Component<DocTileComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Tile": typeof DocTileComponent;
  }
}
