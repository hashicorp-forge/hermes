import Component from "@glimmer/component";

interface DocInlineComponentSignature {
  Args: {
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
