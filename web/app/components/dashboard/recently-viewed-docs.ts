import Component from "@glimmer/component";
import ViewportService from "hermes/services/viewport";
import theme from "tailwindcss/defaultTheme";
import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { debounce } from "@ember/runloop";
import { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import RecentlyViewedDocsService, {
  RecentlyViewedDoc,
} from "hermes/services/recently-viewed-docs";

export const RECENTLY_VIEWED_DOCS_SCROLL_AMOUNT = 300;

interface DashboardRecentlyViewedDocsComponentSignature {}

export default class DashboardRecentlyViewedDocsComponent extends Component<DashboardRecentlyViewedDocsComponentSignature> {
  @service("recently-viewed-docs")
  declare viewedDocs: RecentlyViewedDocsService;
  @service declare viewport: ViewportService;

  @tracked scrollBody: HTMLElement | null = null;

  @tracked _canScrollBack = false;
  @tracked _canScrollForward = false;

  protected get screenIsSmall(): boolean {
    return this.viewport.width < parseInt(theme.screens.lg);
  }

  protected get canScrollBack(): boolean {
    return this._canScrollBack && this.screenIsSmall;
  }

  protected get canScrollForward(): boolean {
    return this._canScrollForward && this.screenIsSmall;
  }

  protected get docs(): RecentlyViewedDoc[] | null {
    return this.viewedDocs.all;
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
    this.scrollBody.scrollBy({
      left: RECENTLY_VIEWED_DOCS_SCROLL_AMOUNT,
      behavior: "smooth",
    });
  }

  @action scrollBack(): void {
    assert("scroll body must be defined", this.scrollBody);
    this.scrollBody.scrollBy({
      left: -RECENTLY_VIEWED_DOCS_SCROLL_AMOUNT,
      behavior: "smooth",
    });
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Dashboard::RecentlyViewedDocs": typeof DashboardRecentlyViewedDocsComponent;
  }
}
