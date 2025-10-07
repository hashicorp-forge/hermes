import Component from "@glimmer/component";
import { service } from "@ember/service";
import { action } from "@ember/object";
import ConfigService from "hermes/services/config";
import SessionService from "hermes/services/session";
import RouterService from "@ember/routing/router-service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import window from "ember-window-mock";
import { tracked } from "@glimmer/tracking";
import { HERMES_GITHUB_REPO_URL } from "hermes/utils/hermes-urls";
import { SortByValue } from "./toolbar";
import { ProjectStatus } from "hermes/types/project-status";
import PersonModel from "hermes/models/person";

interface UserNavItem {
  label: string;
  isNew?: boolean;
}

interface UserNavLinkTo extends UserNavItem {
  route: string;
}

interface UserNavExternalLink extends UserNavItem {
  href: string;
}

interface UserNavAction extends UserNavItem {
  action: () => void;
}

type UserNavMenuItem = UserNavLinkTo | UserNavExternalLink | UserNavAction;

interface HeaderNavComponentSignature {
  Args: {
    query?: string;
  };
}

export default class HeaderNavComponent extends Component<HeaderNavComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service declare session: SessionService;
  @service declare router: RouterService;
  @service declare authenticatedUser: AuthenticatedUserService;

  protected get profile(): PersonModel | null {
    return this.authenticatedUser.info;
  }

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

  protected get dropdownListItems(): UserNavMenuItem[] {
    const defaultItems = [
      {
        label: "Email notifications",
        route: "authenticated.settings",
        isNew: this.emailNotificationsHighlightIsShown,
      },
      {
        label: "GitHub",
        href: this.gitHubRepoURL,
      },
      {
        label: "Support",
        href: this.supportDocsURL,
      },
    ] as UserNavMenuItem[];

    if (this.showSignOut) {
      defaultItems.push({
        label: "Sign out",
        action: this.invalidateSession,
      });
    }

    return defaultItems;
  }

  protected defaultProjectsScreenQueryParams = {
    status: ProjectStatus.Active,
    page: 1,
  };

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
    sortBy: SortByValue.DateDesc,
  };

  protected defaultMyQueryParams = {
    includeSharedDrafts: true,
    page: 1,
    sortBy: SortByValue.DateDesc,
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

  @action protected invalidateSession(): void {
    this.session.invalidate();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::Nav": typeof HeaderNavComponent;
  }
}
