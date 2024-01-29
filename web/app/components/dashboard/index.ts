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
import theme from "tailwindcss/defaultTheme";

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

  @tracked scrollBody: HTMLElement | null = null;

  @tracked _canScrollBack = false;
  @tracked _canScrollForward = false;

  protected get canScrollBack(): boolean {
    return this._canScrollBack && this.screenIsSmall;
  }

  protected get canScrollForward(): boolean {
    return this._canScrollForward && this.screenIsSmall;
  }

  protected get screenIsSmall(): boolean {
    return this.viewport.width < parseInt(theme.screens.lg);
  }

  protected get linkToAllDocsIsShown(): boolean {
    return this.latestDocs.nbPages > 1;
  }

  @action registerScrollBody(element: HTMLElement): void {
    this.scrollBody = element;
    this.updateAffordances();
  }

  @action updateAffordances(): void {
    debounce(() => {
      if (!this.scrollBody) return;
      if (!this.screenIsSmall) {
        this._canScrollBack = false;
        this._canScrollForward = false;
        return;
      } else {
        const { scrollWidth, clientWidth, scrollLeft } = this.scrollBody;

        if (scrollLeft === 0) {
          this._canScrollBack = false;
        } else {
          this._canScrollBack = true;
        }

        if (scrollWidth - scrollLeft === clientWidth) {
          this._canScrollForward = false;
        } else {
          this._canScrollForward = true;
        }
      }
    }, 10);
  }

  @action scrollForward(): void {
    assert("scroll body must be defined", this.scrollBody);
    this.scrollBody.scrollBy({ left: 300, behavior: "smooth" });
  }

  @action scrollBack(): void {
    assert("scroll body must be defined", this.scrollBody);
    this.scrollBody.scrollBy({ left: -300, behavior: "smooth" });
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Dashboard: typeof DashboardIndexComponent;
  }
}
