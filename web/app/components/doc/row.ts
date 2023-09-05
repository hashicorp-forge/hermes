import Component from "@glimmer/component";

interface DocRowComponentSignature {
  Args: {
    avatar: string;
    created: string;
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

export default class DocRowComponent extends Component<DocRowComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Row": typeof DocRowComponent;
  }
}
