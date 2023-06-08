import Component from "@glimmer/component";

interface DocInlineComponentSignature {
  Args: {
    owner: string;
    title: string;
    avatar?: string;
    docID?: string;
    docNumber?: string;
    productArea?: string;
    status?: string;
    isResult?: boolean;
    snippet?: string;
  };
}

export default class DocInlineComponent extends Component<DocInlineComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::Inline": typeof DocInlineComponent;
  }
}
