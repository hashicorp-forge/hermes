import { assert } from "@ember/debug";
import Component from "@glimmer/component";
import type {
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
  /**
   * The maximum number of avatars to show for a project.
   * If a project has more than this number of products, the
   * avatars will be truncated and a "+N" label will be shown.
   */
  private maxAvatars = 2;

  /**
   * Shorthand for the passed-in item.
   */
  private item = this.args.item;

  /**
   * The maybe-nested document. Used to determine if the item is a document.
   */
  private _doc = "doc" in this.item ? this.item.doc : undefined;

  /**
   * The document, when it's known to exist.
   * Used as a reference when passing the `itemIsDoc` check.
   */
  protected get doc() {
    assert("doc must exist", this._doc);
    return this._doc;
  }

  /**
   * The project, when it's known to exist, such as when
   * the item fails the `itemIsDoc` check.
   */
  protected get project() {
    assert("project must exist", "project" in this.item);
    return this.item.project;
  }

  /**
   * Whether the passed-in item is a document.
   * Used in logic checks. True if the item contains a nested doc.
   */
  protected get itemIsDoc() {
    return !!this._doc;
  }

  /**
   * The item-type-dependent LinkTo route.
   */
  protected get targetRoute(): string {
    if (this.itemIsDoc) {
      return "authenticated.document";
    } else {
      return "authenticated.projects.project";
    }
  }

  /**
   * The item-type-dependent LinkTo model.
   */
  protected get modelID(): string {
    if (this.itemIsDoc) {
      return this.doc.objectID;
    } else {
      return this.project.id.toString();
    }
  }

  /**
   * The item-type-dependent LinkTo query.
   */
  protected get query(): Record<string, unknown> {
    if (this.itemIsDoc) {
      return {
        draft: this.doc.status === "WIP",
      };
    } else {
      return {};
    }
  }

  /**
   * The title of the item, whether it's a document or a project.
   */
  protected get title(): string {
    if (this.itemIsDoc) {
      return this.doc.title;
    } else {
      return this.project.title;
    }
  }

  /**
   * The modified time of the item, whether it's a document or a project.
   */
  protected get modifiedTime(): number | undefined {
    if (this.itemIsDoc) {
      return this.doc.modifiedTime || this.doc.createdTime;
    } else {
      return this.project.modifiedTime;
    }
  }

  /**
   * An array of products related to the item.
   * If it's a document, it's a single product.
   * If it's a project, it's a list of N products
   * sorted to show the oldest-added first.
   */
  protected get products(): string[] | undefined {
    if (this.itemIsDoc) {
      return [this.doc.product];
    } else {
      const products = this.project.products?.slice();
      return products?.reverse().slice(0, this.maxAvatars);
    }
  }

  /**
   * The number of additional products that are hidden for space.
   * Used to add a "+N" label next to the avatars. Applies to projects
   * with more than the maximum number of avatars.
   */
  protected get additionalProductCount(): number {
    if (this.itemIsDoc) return 0;

    const productCount = this.project.products?.length || 0;

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
