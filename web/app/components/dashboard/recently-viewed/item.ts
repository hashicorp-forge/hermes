import { assert } from "@ember/debug";
import Component from "@glimmer/component";
import {
  RecentlyViewedDoc,
  RecentlyViewedProject,
} from "hermes/services/recently-viewed";

interface DashboardRecentlyViewedItemComponentSignature {
  Element: HTMLAnchorElement;
  Args: {
    item: RecentlyViewedDoc | RecentlyViewedProject;
  };
}

export default class DashboardRecentlyViewedItemComponent extends Component<DashboardRecentlyViewedItemComponentSignature> {
  private item = this.args.item;

  /**
   * The route to pass to the LinkTo component, depending
   * on whether the item is a document or a project.
   */
  protected get targetRoute(): string {
    if ("doc" in this.item) {
      return "authenticated.document";
    } else {
      return "authenticated.projects.project";
    }
  }

  protected get modelID(): string {
    if ("doc" in this.item) {
      return this.item.doc.objectID;
    } else {
      return this.item.project.id.toString();
    }
  }

  protected get query() {
    if ("doc" in this.item) {
      return {
        draft: this.item.isDraft,
      };
    } else {
      return {};
    }
  }

  protected get products() {
    if ("doc" in this.item) {
      return [this.item.doc.product];
    } else {
      return this.item.project.products;
    }
  }

  protected get title() {
    if ("doc" in this.item) {
      return this.item.doc.title;
    } else {
      return this.item.project.title;
    }
  }

  protected get docType() {
    if ("doc" in this.item) {
      return this.item.doc.docType;
    }
  }

  protected get projectStatus() {
    if ("project" in this.item) {
      return this.item.project.status;
    }
  }

  protected get projectStatusLabel() {
    if ("project" in this.item) {
      return (
        this.item.project.status.charAt(0).toUpperCase() +
        this.item.project.status.slice(1)
      );
    }
  }

  protected get modifiedTime() {
    if ("doc" in this.item) {
      return this.item.doc.modifiedTime;
    } else {
      return this.item.project.modifiedTime;
    }
  }

  protected get docNumber() {
    if ("doc" in this.item) {
      return this.item.doc.docNumber;
    }
  }

  protected get owner() {
    if ("doc" in this.item) {
      return this.item.doc.owners?.[0];
    }
  }

  protected get docStatus() {
    assert("item must be a document", "doc" in this.item);
    return this.item.doc.status;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Dashboard::RecentlyViewed::Item": typeof DashboardRecentlyViewedItemComponent;
  }
}
