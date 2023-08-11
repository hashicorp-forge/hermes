import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

interface DocReviewersRowComponentSignature {
  Args: {
    reviewerMailId: string;
    reviewedBy: string[];
  };
}

export default class DocReviewersRowComponent extends Component<DocReviewersRowComponentSignature> {
  get isReviewed(): boolean {
    let reviewedBy = this.args.reviewedBy || [];
    let reviewerMailId = this.args.reviewerMailId || "";
    let result = false;
    reviewedBy.forEach((element) => {
      if (element === reviewerMailId) {
        result = true;
      }
    });
    return result;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Doc::ReviewersRow": typeof DocReviewersRowComponent;
  }
}
