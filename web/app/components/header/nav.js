import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";

export default class Nav extends Component {
  @service("config") configSvc;
  @service session;
  @service flags;
  @service router;

  @service authenticatedUser;

  @action
  invalidateSession() {
    this.session.invalidate();
  }

  get profile() {
    return this.authenticatedUser.info;
  }

  get defaultBrowseScreenQueryParams() {
    return {
      docType: [],
      owners: [],
      page: 1,
      product: [],
      status: [],
      sortBy: "dateDesc",
    };
  }

  get currentRouteName() {
    return this.router.currentRouteName;
  }
}
