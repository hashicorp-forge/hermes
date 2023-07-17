import Component from "@glimmer/component";

interface DocTileComponentSignature {
  Args: {
    avatar?: string;
    docID?: string;
    docNumber?: string;
    isOwner?: boolean;
    isResult?: boolean;
    modifiedAge?: string;
    owner?: string;
    productArea?: string;
    snippet?: string;
    status?: string;
    thumbnail?: string;
    title?: string;
  };
}

export default class DocTileComponent extends Component<DocTileComponentSignature> {
  protected get productAreaName(): string | undefined {
    // console.log(this.args.docID);

    switch (this.args.productArea) {
      case "Cloud Platform":
        return "HCP";
      default:
        return this.args.productArea;
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Tile": typeof DocTileComponent;
  }
}
