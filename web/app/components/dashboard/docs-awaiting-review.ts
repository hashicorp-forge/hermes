import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";

interface DashboardDocsAwaitingReviewComponentSignature {
  Element: null;
  Args: {
    docs: HermesDocument[];
  };
  Blocks: {
    default: [];
  };
}

export default class DashboardDocsAwaitingReviewComponent extends Component<DashboardDocsAwaitingReviewComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Dashboard::DocsAwaitingReview": typeof DashboardDocsAwaitingReviewComponent;
  }
}
