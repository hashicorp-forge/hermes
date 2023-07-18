import Component from '@glimmer/component';
import { inject as service } from "@ember/service";
import { action } from "@ember/object";
import ConfigService from "hermes/services/config";
import SessionService from "hermes/services/session";
import RouterService from "@ember/routing/router-service";
import { task } from "ember-concurrency";
import { computed } from '@ember/object';
import AuthenticatedUserService, {
  AuthenticatedUser,
} from "hermes/services/authenticated-user";
import FetchService from "hermes/services/fetch";
import window from "ember-window-mock";
import { tracked } from "@glimmer/tracking";

interface HeaderNavComponentSignature {
  Args: {};
}

type TeamAreas = {
  [key: string]: TeamArea;
};

export type TeamArea = {
  abbreviation: string;
  perDocDataType: unknown;
  BU: string
};

type ProductAreas = {
  [key: string]: ProductArea;
};

export type ProductArea = {
  abbreviation: string;
  perDocDataType: unknown;
  teams: unknown;
};


export default class HeaderNavComponent extends Component<HeaderNavComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service declare session: SessionService;
  @service declare router: RouterService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @tracked showModal: boolean=false;
  @service("fetch") declare fetchSvc: FetchService;
  @tracked teams: TeamAreas| undefined = undefined;
  @tracked products: ProductAreas| undefined = undefined;

  protected get profile(): AuthenticatedUser {
    return this.authenticatedUser.info;
  }

  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  protected get showSignOut(): boolean {
    return !this.configSvc.config.skip_google_auth;
  }

  constructor(owner: unknown, args: object) {
    super(owner, args);
    // Load data when the component is inserted into the DOM
    this.fetch.perform();
  }


  protected fetch = task(async () => {
    try {
      // Filter the teams based on the selected business unit
      this.teams = await this.fetchSvc
          .fetch("/api/v1/teams")
          .then((resp) => resp?.json());
      } catch (err) {
        throw err;
      }

      try {
        let products = await this.fetchSvc
          .fetch("/api/v1/products")
          .then((resp) => resp?.json());
        this.products = products;
      } catch (err) {
        console.error(err);
        throw err;
      }

       // Map through the products and set the 'teams' property 
    if (this.products) {
      const temp: ProductAreas = {};
      const productKeys = Object.keys(this.products) as Array<keyof ProductAreas>;
      for (const productKey of productKeys) {
        const product: ProductArea = this.products![productKey]!;
        if (product) {
          product.teams = this.filteredOptions(productKey as string);
        }
        temp[productKey] = product;
      }
      this.products = temp;;
    }

    });

  @action
  toggleModal() {
    this.showModal = !this.showModal;
  }


  // Method to filter teams by business unit
  filteredOptions(selectedBU: string) {
   
    // Filter the teams based on the selected business unit
    const filteredTeams: TeamAreas = {};
    let teams: TeamAreas = this.teams!;

    for (const team in teams) {
      if (Object.prototype.hasOwnProperty.call(teams, team)) {
        const teamData: TeamArea | undefined = teams[team];
        if (teamData && teamData.BU  === selectedBU) {
          filteredTeams[team] = teamData;
        }
      }
    }
    return filteredTeams;
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
    'Header::Nav': typeof HeaderNavComponent;
  }
}

