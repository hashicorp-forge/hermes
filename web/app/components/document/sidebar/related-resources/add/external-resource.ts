import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

interface DocumentSidebarRelatedResourcesAddExternalResourceSignature {
  Element: null;
  Args: {
    title: string;
    url: string;
    onSubmit: () => void;
    onInput: (e: Event) => void;
    linkIsDuplicate?: boolean;
  };
}

export default class DocumentSidebarRelatedResourcesAddExternalResource extends Component<DocumentSidebarRelatedResourcesAddExternalResourceSignature> {
  @tracked titleErrorIsShown = false;

  get errorIsShown() {
    return this.titleErrorIsShown || this.args.linkIsDuplicate;
  }
  /**
   * The action run when the "add" button is clicked.
   * Calls the parent method unless the link is a duplicate.
   */
  @action onSubmit() {
    // if the link doesn't have a title, don't submit
    if (!this.args.title) {
      this.titleErrorIsShown = true;
      return;
    }

    if (!this.args.linkIsDuplicate) {
      this.args.onSubmit();
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::Add::ExternalResource": typeof DocumentSidebarRelatedResourcesAddExternalResource;
  }
}
