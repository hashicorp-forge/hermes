import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

interface DocReviewersTableComponentSignature {
  Args: {
    reviewers: string[];
    reviewedBy: string[];
  };
}

export default class DocReviewersTableComponent extends Component<DocReviewersTableComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::ReviewersTable": typeof DocReviewersTableComponent;
  }
}
