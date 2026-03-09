import Component from "@glimmer/component";
import type { HermesDocument } from "hermes/types/document";

interface DashboardDocsAwaitingReviewDocComponentSignature {
  Element: null;
  Args: {
    doc: HermesDocument;
  };
  Blocks: {
    default: [];
  };
}

export default class DashboardDocsAwaitingReviewDocComponent extends Component<DashboardDocsAwaitingReviewDocComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Dashboard::DocsAwaitingReview::Doc": typeof DashboardDocsAwaitingReviewDocComponent;
  }
}
