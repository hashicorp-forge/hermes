import Component from "@glimmer/component";

interface DocumentStatusIconComponentSignature {
  Element: null;
  Args: {
    status: string;
  };
  Blocks: {
    default: [];
  };
}

export default class DocumentStatusIconComponent extends Component<DocumentStatusIconComponentSignature> {
  protected get isDraft() {
    return this.args.status === "WIP";
  }

  protected get isInReview() {
    return this.args.status === "In-Review";
  }

  protected get isApproved() {
    return this.args.status === "Approved";
  }

  protected get isObsolete() {
    return this.args.status === "Obsolete";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::StatusIcon": typeof DocumentStatusIconComponent;
  }
}
