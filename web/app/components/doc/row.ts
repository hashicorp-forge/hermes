import Component from "@glimmer/component";

interface DocRowComponentSignature {
  Args: {
    avatar: string;
    createdDate: string;
    docID: string;
    docNumber: string;
    docType: string;
    owner: string;
    title: string;
    isDraft?: boolean;
    productArea: string;
    status: string;
    isResult?: boolean;
    isOwner?: boolean;
  };
}

export default class DocRowComponent extends Component<DocRowComponentSignature> {
  get productAreaName() {
    if (this.args.productArea === "Cloud Platform") {
      return "HCP";
    } else {
      return this.args.productArea;
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Row": typeof DocRowComponent;
  }
}
