import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import AuthenticatedUserService from "hermes/services/authenticated-user";

interface MyHeaderComponentSignature {
  Args: {
    toggleOwnerFilterIsShown?: boolean;
  };
}

export default class MyHeaderComponent extends Component<MyHeaderComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare router: RouterService;

  protected get userImgURL() {
    return this.authenticatedUser.info.picture;
  }

  protected get userName() {
    return this.authenticatedUser.info.name;
  }

  protected get userEmail() {
    return this.authenticatedUser.info.email;
  }

  protected get currentRoute() {
    return this.router.currentRouteName;
  }

  protected get ownerToggleIsChecked() {
    return !this.router.currentRoute.queryParams["excludeSharedDrafts"];
  }

  protected get ownerFilterQueryParams() {
    if (this.router.currentRoute.queryParams["excludeSharedDrafts"]) {
      return {
        excludeSharedDrafts: false,
        page: 1,
      };
    }
    return {
      excludeSharedDrafts: true,
      page: 1,
    };
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "My::Header": typeof MyHeaderComponent;
  }
}
