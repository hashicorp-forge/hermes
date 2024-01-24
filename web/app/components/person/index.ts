import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import StoreService from "hermes/services/store";
import getModelAttr from "hermes/utils/get-model-attr";

interface PersonComponentSignature {
  Element: HTMLDivElement;
  Args: {
    email: string;
    ignoreUnknown?: boolean;
    badge?: string;
  };
}

export default class PersonComponent extends Component<PersonComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare store: StoreService;

  get isHidden() {
    return this.args.ignoreUnknown && !this.args.email;
  }

  protected get label() {
    if (this.args.email === this.authenticatedUser.info.email) {
      return "Me";
    }

    return (
      getModelAttr(this.store, ["person", "name", this.args.email]) ?? "Unknown"
    );
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Person: typeof PersonComponent;
  }
}
