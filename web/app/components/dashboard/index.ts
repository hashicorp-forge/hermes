import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import RecentlyViewedDocsService from "hermes/services/recently-viewed-docs";
import LatestDocsService from "hermes/services/latest-docs";
import ViewportService from "hermes/services/viewport";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { assert } from "@ember/debug";
import { debounce } from "@ember/runloop";

interface DashboardIndexComponentSignature {
  Element: null;
  Args: {
    docsAwaitingReview?: HermesDocument[];
  };
  Blocks: {
    default: [];
  };
}

export default class DashboardIndexComponent extends Component<DashboardIndexComponentSignature> {
  @service("latest-docs") declare latestDocs: LatestDocsService;
  @service("recently-viewed-docs")
  declare viewedDocs: RecentlyViewedDocsService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare viewport: ViewportService;

  @tracked _scrollBody: HTMLElement | null = null;

  @tracked _scrollLeftAffordanceIsShown = false;
  @tracked _scrollRightAffordanceIsShown = false;

  protected get scrollLeftAffordanceIsShown(): boolean {
    return this._scrollLeftAffordanceIsShown && this.screenIsSmall;
  }

  protected get scrollRightAffordanceIsShown(): boolean {
    return this._scrollRightAffordanceIsShown && this.screenIsSmall;
  }

  protected get screenIsSmall(): boolean {
    // TODO: unify this with tailwind
    return this.viewport.width < 1024;
  }

  protected get linkToAllDocsIsShown(): boolean {
    return this.latestDocs.nbPages > 1;
  }

  @action registerScrollBody(element: HTMLElement): void {
    this._scrollBody = element;
    this.updateAffordances();
  }

  // the problem is that this is called on scroll but not on resize
  // so we need to find a way to call this on resize
  @action updateAffordances(): void {
    debounce(() => {
      if (!this._scrollBody) return;
      if (!this.screenIsSmall) {
        this._scrollLeftAffordanceIsShown = false;
        this._scrollRightAffordanceIsShown = false;
        return;
      } else {
        const { scrollWidth, clientWidth, scrollLeft } = this._scrollBody;

        if (scrollLeft === 0) {
          this._scrollLeftAffordanceIsShown = false;
        } else {
          this._scrollLeftAffordanceIsShown = true;
        }

        if (scrollWidth - scrollLeft === clientWidth) {
          this._scrollRightAffordanceIsShown = false;
        } else {
          this._scrollRightAffordanceIsShown = true;
        }
      }
    }, 10);
  }

  @action scrollRight(): void {
    assert("scroll body must be defined", this._scrollBody);

    this._scrollBody.scrollBy({ left: 300, behavior: "smooth" });
  }

  @action scrollLeft(): void {
    assert("scroll body must be defined", this._scrollBody);

    this._scrollBody.scrollBy({ left: -300, behavior: "smooth" });
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Dashboard: typeof DashboardIndexComponent;
  }
}
