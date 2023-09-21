import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";
import ConfigService from "hermes/services/config";
import SessionService from "hermes/services/session";
import RouterService from "@ember/routing/router-service";
import AuthenticatedUserService, {
  AuthenticatedUser,
} from "hermes/services/authenticated-user";
import window from "ember-window-mock";
import { tracked } from "@glimmer/tracking";
import { HERMES_GITHUB_REPO_URL } from "hermes/utils/hermes-urls";
import { XDropdownListAnchorAPI } from "../x/dropdown-list";
import htmlElement from "hermes/utils/html-element";

interface HeaderNavComponentSignature {
  Args: {};
}

export default class HeaderNavComponent extends Component<HeaderNavComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service declare session: SessionService;
  @service declare router: RouterService;
  @service declare authenticatedUser: AuthenticatedUserService;

  @tracked private _anchor: HTMLElement | null = null;

  @tracked private _dd: XDropdownListAnchorAPI | null = null;

  protected get profile(): AuthenticatedUser {
    return this.authenticatedUser.info;
  }

  protected documentNavItems = {
    // all: {
    //   label: "All Documents",
    //   route: "authenticated.documents",
    // },
    my: {
      label: "Published",
      route: "authenticated.my.published",
    },
    drafts: {
      label: "Drafts",
      route: "authenticated.my.drafts",
    },
  };

  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  protected get showSignOut(): boolean {
    return !this.configSvc.config.skip_google_auth;
  }

  protected get gitHubRepoURL() {
    return HERMES_GITHUB_REPO_URL;
  }

  protected get supportDocsURL() {
    return this.configSvc.config.support_link_url;
  }

  /**
   * The default query params for the browse screens.
   * Ensures a clear filter state when navigating tabs.
   */
  protected defaultBrowseScreenQueryParams = {
    docType: [],
    owners: [],
    page: 1,
    product: [],
    status: [],
    sortBy: "dateDesc",
  };

  /**
   * Whether to the "new" badge should appear on the email notifications menuitem.
   * Will be false if the user has previously closed the dropdown.
   */
  @tracked protected emailNotificationsHighlightIsShown =
    window.localStorage.getItem("emailNotificationsHighlightIsShown") !==
    "false";

  /**
   * Whether a highlight icon should appear over the user avatar.
   * True when the user hasn't seen the menu's active highlights,
   * (i.e., when we've just announced a feature), as determined by localStorage.
   * Set false when the user menu is opened.
   */
  @tracked protected userMenuHighlightIsShown =
    this.emailNotificationsHighlightIsShown;

  /**
   * The actions to take when the dropdown menu is opened.
   * Force-hides the highlight icon if it's open.
   * (We assume the user to have seen the highlight when they open the menu.)
   */
  @action protected onDropdownOpen(): void {
    this.userMenuHighlightIsShown = false;
    window.localStorage.setItem("emailNotificationsHighlightIsShown", "false");
  }

  @action protected registerAnchor(
    dd: XDropdownListAnchorAPI,
    element: HTMLElement,
  ) {
    this._anchor = element;
    this._dd = dd;
    this._dd.registerAnchor(this._anchor);
  }

  @action protected maybeHideContent(event: MouseEvent | FocusEvent): void {
    console.log("mouseEvent", event);
    // this runs on mouseleave of the dropdown anchor.
    // if the target element is within the dropdown anchor, ignore the event.
    // if the target element that's being hovered is part of the dropdown content,
    // ignore the event.
    // in other cases, run the hideContent function.
    const relatedTarget = event.relatedTarget as HTMLElement;
    const popoverSelector = this._dd?.ariaControls;
    const popover = htmlElement(`#${popoverSelector}`);

    if (
      this._anchor?.contains(relatedTarget) ||
      popover?.contains(relatedTarget)
    ) {
      console.log("target is within anchor");
      return;
    } else {
      console.log("target is not within anchor");
      this._dd?.hideContent();
    }
  }

  @action protected maybeShowContent(event: MouseEvent | FocusEvent): void {
    console.log("mouseEvent", event);
    if (event.relatedTarget === event.target) {
      console.log("target is relatedTarget");
      return;
    }
    this._dd?.showContent();
  }

  /**
   * The actions to take when the dropdown menu is closed.
   * Force-hides the emailNotificationsHighlight if it's visible.
   */
  @action protected onDropdownClose(): void {
    this.emailNotificationsHighlightIsShown = false;
  }

  @action protected invalidateSession(): void {
    this.session.invalidate();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::Nav": typeof HeaderNavComponent;
  }
}
