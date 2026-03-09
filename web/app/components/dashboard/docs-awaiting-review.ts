import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import type { HermesDocument } from "hermes/types/document";

interface DashboardDocsAwaitingReviewComponentSignature {
  Element: null;
  Args: {
    docs: HermesDocument[];
  };
  Blocks: {
    default: [];
  };
}

export default class DashboardDocsAwaitingReviewComponent extends Component<DashboardDocsAwaitingReviewComponentSignature> {
  /**
   * Whether the list is considered collapsed. Determines which docs to show,
   * as well as the text and icon of the toggle button.
   */
  @tracked protected isCollapsed = true;

  /**
   * (Up to) the first four docs. The default documents shown.
   */
  private get firstFourDocs() {
    return this.args.docs.slice(0, 4);
  }

  /**
   * Whether the toggle button should be shown.
   * True if there are more than four docs.
   */
  protected get toggleButtonIsShown() {
    return this.args.docs.length > 4;
  }

  /**
   * The docs to show in the list. If the list is collapsed,
   * we show the first four docs. Otherwise, we show all docs.
   */
  protected get docsToShow() {
    return this.isCollapsed ? this.firstFourDocs : this.args.docs;
  }

  /**
   * The action to take when the toggle button is clicked.
   */
  @action protected toggleCollapsed() {
    this.isCollapsed = !this.isCollapsed;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Dashboard::DocsAwaitingReview": typeof DashboardDocsAwaitingReviewComponent;
  }
}
