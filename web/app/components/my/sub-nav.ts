import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import AuthenticatedUserService from "hermes/services/authenticated-user";

interface MySubNavComponentSignature {
  Args: {
    toggleOwnerFilter: () => void;
  };
}

export default class MySubNavComponent extends Component<MySubNavComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;

  protected get userImgURL() {
    return this.authenticatedUser.info.picture;
  }

  protected get userName() {
    return this.authenticatedUser.info.name;
  }

  protected get userEmail() {
    return this.authenticatedUser.info.email;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "My::SubNav": typeof MySubNavComponent;
  }
}
