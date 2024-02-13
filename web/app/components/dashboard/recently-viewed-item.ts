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

  protected get product() {
    assert("docType must exist", "doc" in this.item);
    return this.item.doc.product;
  }

  protected get title() {
    if ("doc" in this.item) {
      return this.item.doc.title;
    } else {
      return this.item.project.title;
    }
  }

  protected get badgeText() {
    assert("item must be a document", "doc" in this.item);
    return this.item.doc.docType;
  }

  protected get projectStatus() {
    if ("project" in this.item) {
      return this.item.project.status;
    }
  }

  protected get docNumber() {
    assert("item must be a document", "doc" in this.item);
    return this.item.doc.docNumber;
  }

  protected get owner() {
    assert("item must be a document", "doc" in this.item);
    return this.item.doc.owners?.[0];
  }

  protected get modifiedTime() {
    assert("item must be a document", "doc" in this.item);
    console.log(this.item.doc);
    return this.item.doc.modifiedTime;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Dashboard::RecentlyViewedItem": typeof DashboardRecentlyViewedItemComponent;
  }
}
