import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import { HermesProject } from "hermes/routes/authenticated/projects";
import FetchService from "hermes/services/fetch";
import { HermesDocument } from "hermes/types/document";

interface DocumentSidebarHeaderComponentSignature {
  Element: HTMLDivElement;
  Args: {
    document: HermesDocument;
    isCollapsed: boolean;
    toggleCollapsed: () => void;
    userHasScrolled: boolean;
    shareURL: string;
    shareButtonIsShown?: boolean;
    shareButtonIsLoading?: boolean;
    shareButtonTooltipText?: string;
    shareButtonIcon?: string;
  };
}

export default class DocumentSidebarHeaderComponent extends Component<DocumentSidebarHeaderComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked modalIsShown = false;
  @tracked projectResults: Record<string, HermesProject> = {};

  protected get dropdownItems() {
    return [
      {
        // TODO: should be a link to create a new project
        // TODO: maybe should display the name typed in the search box
        name: "Create new project",
        icon: "plus",
      },
      ...Object.values(this.projectResults),
    ];
  }

  /**
   * Whether the tooltip is forced open, regardless of hover state.
   * True if the parent component has passed a tooltip text prop,
   * e.g., "Creating link..." or "Link created!"
   */
  get tooltipIsForcedOpen() {
    if (this.args.shareButtonTooltipText) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * If the share button is shown. If the parent component sets this true,
   * it will override the default behavior, which is to show the share button
   * if the document is published and has a docType and docNumber.
   */
  protected get shareButtonIsShown() {
    if (this.args.shareButtonIsShown) {
      return this.args.shareButtonIsShown;
    }

    let { document } = this.args;
    return !document.isDraft && document.docNumber && document.docType;
  }

  @action protected showModal() {
    this.modalIsShown = true;
  }

  @action protected hideModal() {
    this.modalIsShown = false;
  }

  @action protected onInput(event: Event) {
    return;
  }

  @action onKeydown(event: KeyboardEvent) {
    return;
  }

  @action protected loadProjects() {
    console.log("should load projects");
    this._loadProjects.perform();
  }

  private _loadProjects = task(async () => {
    try {
      this.projectResults = await this.fetchSvc
        .fetch("/api/v1/projects")
        .then((response) => response?.json());
    } catch {
      // TODO: handle error
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::Header": typeof DocumentSidebarHeaderComponent;
  }
}
