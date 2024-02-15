import { assert } from "@ember/debug";
import Component from "@glimmer/component";
import {
  RecentlyViewedDoc,
  RecentlyViewedProject,
} from "hermes/services/recently-viewed";
import {
  ProjectStatus,
  ProjectStatusObject,
} from "hermes/types/project-status";

interface DashboardRecentlyViewedItemComponentSignature {
  Element: HTMLAnchorElement;
  Args: {
    item: RecentlyViewedDoc | RecentlyViewedProject;
  };
}

export default class DashboardRecentlyViewedItemComponent extends Component<DashboardRecentlyViewedItemComponentSignature> {
  private item = this.args.item;

  maxAvatars = 2;

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

  /**
   * The model ID to pass to the LinkTo component, depending
   * on whether the item is a document or a project.
   */
  protected get modelID(): string {
    if ("doc" in this.item) {
      return this.item.doc.objectID;
    } else {
      return this.item.project.id.toString();
    }
  }

  /**
   * The query to pass to the LinkTo component, depending
   * on whether the item is a document or a project.
   */
  protected get query(): Record<string, unknown> {
    if ("doc" in this.item) {
      return {
        draft: this.item.isDraft,
      };
    } else {
      return {};
    }
  }

  /**
   * The title of the item, whether it's a document or a project.
   */
  protected get title(): string {
    if ("doc" in this.item) {
      return this.item.doc.title;
    } else {
      return this.item.project.title;
    }
  }

  /**
   * The product(s) related to the item. For documents, this is
   * a single product. For projects, this is an array of products
   * ordered to show first-added products first.
   */
  protected get products(): string[] | undefined {
    if ("doc" in this.item) {
      return [this.item.doc.product];
    } else {
      const products = this.item.project.products?.slice();
      return products?.reverse().slice(0, this.maxAvatars);
    }
  }

  /**
   * The modified time of the item, whether it's a document or a project.
   */
  protected get modifiedTime(): number | undefined {
    if ("doc" in this.item) {
      return this.item.doc.modifiedTime;
    } else {
      return this.item.project.modifiedTime;
    }
  }

  /**
   * The status of the item, if it's a document.
   */
  protected get docStatus(): string | undefined {
    if ("doc" in this.item) {
      return this.item.doc.status;
    }
  }

  /**
   * The docType of the item, if it's a document.
   */
  protected get docType(): string | undefined {
    if ("doc" in this.item) {
      return this.item.doc.docType;
    }
  }

  /**
   * The document number of the item, if it's a document.
   */
  protected get docNumber(): string | undefined {
    if ("doc" in this.item) {
      return this.item.doc.docNumber;
    }
  }

  /**
   * The owner of the item, if it's a document.
   */
  protected get owner(): string | undefined {
    if ("doc" in this.item) {
      return this.item.doc.owners?.[0];
    }
  }

  /**
   * The status of the project, if it's a project.
   */
  protected get projectStatus(): ProjectStatus | undefined {
    if ("project" in this.item) {
      return this.item.project.status;
    }
  }

  /**
   * The status of the project, if it's a project.
   */
  protected get projectStatusLabel(): ProjectStatusObject["label"] | undefined {
    if ("project" in this.item) {
      return (
        this.item.project.status.charAt(0).toUpperCase() +
        this.item.project.status.slice(1)
      );
    }
  }

  /**
   * The number of additional products that are hidden for space.
   * Used to add a "+N" label next to the avatars. Applies to projects
   * with more than the maximum number of avatars.
   */
  protected get additionalProductsCount(): number {
    const productCount = this.products?.length || 0;

    if (productCount <= this.maxAvatars) {
      return 0;
    } else {
      return productCount - this.maxAvatars;
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Dashboard::RecentlyViewed::Item": typeof DashboardRecentlyViewedItemComponent;
  }
}
